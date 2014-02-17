'use strict';

var
    _ = require('lodash')
    , fs = require('fs-extra')
    , zlib = require('zlib')
    , moment = require('moment')
    , mkdirp = require('mkdirp')
    , fibrous = require('fibrous')
    , bitcoin = require('bitcoin')
    , config = require('./conf/config')
    ;

var client = new bitcoin.Client(config.bitcoind);

var tx, block, debug = true;

var getBalances = exports.getBalances = function (unspent) {
    return _.map(
        _.reduce(unspent, function (bal, u) {
            bal[u.address] = (bal[u.address] || 0) + u.value;
            return bal;
        }, {}),
        function (v, k) {
            return [k, v];
        });
};

if (process.argv[1].indexOf('ptsaccounting') == -1) {
    return; // stuff below is only for direct execution of this file
}

fibrous(function () {
    var DECODE_TX = 1;
    var c = client.sync.getBlockCount(),
        first = 1, last = process.argv[2] ? parseInt(process.argv[2]) : c,
        nextBlockHash = null,
        lastBlockTime = 0,
        unspent = {} // txId_n -> value,address
        , coinbase = 50 // cause we're skipping genesis block which still did create 50 coins
        , lastOutputDate = null
        ;

    // create cache folders
    mkdirp.sync('cache/internal');
    mkdirp.sync('cache/balance');

    for (var i = first; i < last; i++) {
        // get block info
        var blockHash = nextBlockHash || client.sync.getBlockHash(i);
        block = client.sync.getBlock(blockHash);
        nextBlockHash = block.nextblockhash;

        var date = moment.utc(block.time * 1000);
        if (date.hour() == 0 && (!lastOutputDate || date.dayOfYear() > lastOutputDate.dayOfYear())) {
            // first block of the day, output stuff for the last day now

            date.subtract('days', 1);
            lastOutputDate = date;

            var ts = date.format('YYYY_MM_DD');
            // write unspent state for fast resume
            cacheInternalJson(coinbase, unspent, ts);
            // compute and write balance for public consumption
            cacheJson({
                blocknum: block.height - 1,
                blocktime: lastBlockTime,
                moneysupply: coinbase,
                balances: getBalances(unspent)
            }, 'balance/' + ts);
        }
        _.each(block.tx, function (txId) {
            tx = client.sync.getRawTransaction(txId, DECODE_TX);
            var isCoinbase = false;
            _.each(tx.vin, function (vin) {
                if (vin.coinbase) {
                    isCoinbase = true;
                    return;
                }
                var k = (vin.txid + '_' + vin.vout);
                delete unspent[k];
            });
            _.each(tx.vout, function (vout) {
                // TODO check for other kinds of scripts?

                if (vout.scriptPubKey.addresses.length != 1) {
                    throw "== more/less than one address for tx#" + txId;
                }
                unspent[tx.txid + '_' + vout.n] = {
                    value: vout.value,
                    address: vout.scriptPubKey.addresses[0]
                };
                if (isCoinbase) {
                    coinbase += vout.value;
                }
            });
        });

        lastBlockTime = block.time;
    }

    cacheInternalJson(coinbase, unspent, 'lastblock');

})(function (err, d) {
    if (err) {
//        console.log(block);
//        console.log(tx);
        console.log(err.stack || err);
    }
});

function cacheJson(out, path, onlyCompressed) {
    var str = JSON.stringify(out);
    var internalFile = 'cache/' + path + '.json';
    zlib.gzip(str, function (err, unspentOut) {
        if (err) {
            console.log("couldn't gzip file", err);
            throw err;
        }
        fs.writeFile(internalFile + '.gz', unspentOut, function (err) {
            if (err) {
                console.log("couldn't write balance file", err);
                throw err;
            }
        });
    });
    if (!onlyCompressed) {
        fs.writeFile(internalFile, str);
    }
}

function cacheInternalJson(coinbase, unspent, id) {
    var out = _.extend({
        coinbase: coinbase,
        unspent: unspent
    }, block ? {block: _.pick(block, ['hash', 'time', 'height'])} : {});
    cacheJson(out, 'internal/' + id, !debug);
}
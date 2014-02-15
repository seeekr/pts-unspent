var bitcoin = require('bitcoin')
    , _ = require('lodash')
    , fs = require('fs-extra')
    , zlib = require('zlib')
    , moment = require('moment')
    , mkdirp = require('mkdirp')
    ;
var fibrous = require('fibrous');
var client = new bitcoin.Client({
    host: 'localhost',
    port: 4321,
    user: 'protosharesrpc',
    pass: 'b42a0ae5c031fc31646213866bf902db'
});

var tx, block;

var getBalances = exports.getBalances = function (unspent) {
    return _.map(
        _.reduce(unspent, function (bal, u) {
            bal[u.address] = (bal[u.address] || 0) + u.value;
            return bal;
        }, {}),
        function (v, k) {
            var o = {};
            o[k] = v;
            return o;
        });
};

function writeInfo(m, coinbase, unspent, debug, lastBlockTime) {
    if (m.hour() == 0) {
        // first block of the day, output stuff for the last day now
        m.subtract('days', 1);
        var timeFmt = m.format('YYYY_MM_DD');

        // write unspent state for fast resume
        var unspentOut = JSON.stringify({coinbase: coinbase, unspent: unspent});
        var internalFile = 'cache/internal/' + timeFmt + '.json';
        zlib.gzip(unspentOut, function (err, unspentOut) {
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
        if (debug) {
            fs.writeFile(internalFile, unspentOut);
        }

        // compute and write balance for public consumption
        var balanceOut = JSON.stringify({
            blocknum: block.height - 1,
            blocktime: lastBlockTime,
            moneysupply: coinbase,
            balances: getBalances(unspent)
        });
        var balanceFile = 'cache/balance/' + timeFmt + '.json';
        fs.writeFile(balanceFile, balanceOut, function (err) {
            if (err) {
                console.log(err);
                throw err;
            }
            fs.createReadStream(balanceFile).pipe(zlib.createGzip()).pipe(fs.createWriteStream(balanceFile + '.gz'));
        });
    }
}

fibrous(function () {
    const DECODED = 1;
    var c = client.sync.getBlockCount(),
        first = 1, last = process.argv[2] ? parseInt(process.argv[2]) : c,
        nextBlockHash = null,
        lastBlockTime = 0,
        unspent = {} // txId_n -> value,address
        , coinbase = 50 // cause we're skipping genesis block which still did create 50 coins
        , debug = true
        ;

    // create cache folders
    mkdirp.sync('cache/internal');
    mkdirp.sync('cache/balance');

    for (var i = first; i < last; i++) {
        // get block info
        var blockHash = nextBlockHash || client.sync.getBlockHash(i);
        block = client.sync.getBlock(blockHash);
        nextBlockHash = block.nextblockhash;

        var m = moment.utc(block.time * 1000);
        if (i % 100 == 0) {
            console.log("blocktime: %s", m.format());
        }

        writeInfo(m, coinbase, unspent, debug, lastBlockTime);

        _.each(block.tx, function (txId) {
            tx = client.sync.getRawTransaction(txId, DECODED);
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
                if (vout.scriptPubKey.addresses.length != 1) {
                    console.log("== more/less than one address for tx#" + txId, tx);
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
})(function (err, d) {
    if (err) {
//        console.log(block);
//        console.log(tx);
        console.log(err.stack || err);
    }
});
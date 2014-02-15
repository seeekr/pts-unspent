var bitcoin = require('bitcoin')
    , _ = require('lodash')
    , fs = require('fs-extra')
    , snappy = require('snappy')
    , zlib = require('zlib')
    , moment = require('moment')
    , mkdirp = require('mkdirp')
    , program = require('commander')
    ;
var fibrous = require('fibrous');
var client = new bitcoin.Client({
    host: 'localhost',
    port: 4321,
    user: 'protosharesrpc',
    pass: 'b42a0ae5c031fc31646213866bf902db'
});

program
    .option('-c, --clear-cache', 'Start with fresh cache')
    .parse(process.argv);

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

//fs.writeFile('cache/file1', 'asdf');
//fs.writeFile('cache/file2', 'asdf');
//
//var gzip = zlib.createGzip();
//fs.createReadStream('cache/file1').pipe(gzip).pipe(fs.createWriteStream('cache/file1.gz'));

//zlib.gzip('asdf', function (err, out) {
//    console.log(out);
//    fs.writeFile('cache/abcd', out.toString('base64'), function(err) {
//        if(err) {
//            console.log(err);
//        }
//        console.log("done");
//    });
//});

//fs.writeFile('cache/qwer', 'qwer');

//process.exit();

function write2(f, contents, cb) {
    fs.open(f, 'w', function (err, fd) {
        if (err) {
            console.log("couldn't open file", err);
            if (cb) {
                cb(err);
            } else {
                throw err;
            }
        }
        fs.write(fd, new Buffer(contents, 'utf8'), function (err) {
            try {
                if (err) {
                    console.log("couldn't write file", err);
                    if (cb) {
                        cb(err);
                    } else {
                        throw err;
                    }
                }
            } finally {
                fs.close(fd, function (err) {
                    if (err) {
                        console.log("couldn't write file", err);
                        if (cb) {
                            cb(err);
                        } else {
                            throw err;
                        }
                    }
                    if (cb) {
                        cb(err);
                    }
                });
            }
        });
    });
}

function write(f, contents, cb) {
//    fs.writeFile(f, contents, cb);
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

    if (program.clearCache) {
        fs.removeSync('cache');
    }
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
        if (m.hour() == 0) {
            // first block of the day, output stuff for the last day now
            m.subtract('days', 1);
            const timeFmt = m.format('YYYY_MM_DD');

            // write unspent state for fast resume
            const unspentOut = JSON.stringify({coinbase: coinbase, unspent: unspent});
//            snappy.compress(unspentOut, function (err, unspentOut) {
//                if (err) {
//                    console.log("couldn't snappy-compress file", err);
//                    throw err;
//                }
//                fs.writeFile('cache/internal/' + timeFmt + '.json.snappy', unspentOut);
//            });
            if (debug) {
                write('cache/internal/' + timeFmt + '.json', unspentOut);
            }

            // compute and write balance for public consumption
            const balanceOut = JSON.stringify({
                blocknum: block.height - 1,
                blocktime: lastBlockTime,
                moneysupply: coinbase,
                balances: getBalances(unspent)
            });
            const balanceFile = 'cache/balance/' + timeFmt + '.json';
            write(balanceFile, balanceOut, function (err) {
                if (err) {
                    console.log(err);
                    throw err;
                }
                fs.createReadStream(balanceFile).pipe(zlib.createGzip()).pipe(fs.createWriteStream(balanceFile + '.gz'));
            });
//            zlib.gzip(balanceOut, function (err, balanceOut) {
//                if (err) {
//                    console.log("couldn't gzip file", err);
//                    throw err;
//                }
//                fs.writeFile('cache/balance/' + timeFmt + '.json.gz', balanceOut, function (err) {
//                    if (err) {
//                        console.log("couldn't write balance file", err);
//                        throw err;
//                    }
//                });
//            });
        }

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
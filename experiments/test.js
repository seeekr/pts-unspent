var bitcoin = require('bitcoin'), _ = require('underscore'), Q = require('q');
var client = new bitcoin.Client({
    host: 'localhost',
    port: 4321,
    user: 'protosharesrpc',
    pass: 'b42a0ae5c031fc31646213866bf902db'
});

function print(err, o, cb) {
    if (err) {
        console.log(err);
    } else {
        if (!cb) {
            console.log(o);
        } else {
            cb.apply(null, [err, o]);
        }
    }
}
function printAnd(cb) {
    return function (err, o) {
        print(err, o, cb);
    };
}

//parseInt(process.argv[2])

var accounting = {};

// one way...
// getblockhash(index) -> getblock(hash) ->
client.getBlockCount(function (err, c) {
    for (var i = 0; i < 10; i++) {
        client.getBlockHash(i, function (err, hash) {
            client.getBlock(hash, printAnd(function (err, block) {
//        console.log(block);
                console.log("block #" + block.height + " with " + block.tx.length + " tx", block.tx);
                _.each(block.tx, function (txId) {
//            console.log('getting info for tx %s', txId);
                    client.getRawTransaction(txId, 1, function (err, tx) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        console.log(tx);
                        console.log("\ttx " + tx.txid);
                        var txIns = _.map(tx.vin, function (vin) {
                            return vin.txid;
                        });

                        console.log("\t\tall the money from " + txIns.length + " tx-s is going to...");

                        var txOuts = _.map(tx.vout, function (vout) {
//                    var scriptParts = vout.scriptPubKey.asm.split(' ');
//                    var pubKey = _.find(scriptParts, function (part) { // find first that doesn't begin with OP_, that's our pubKey
//                        return part.indexOf('OP_') != 0;
//                    });
                            return {
                                value: vout.value,
                                to: vout.scriptPubKey.addresses[0]
                            };
                        });

                        console.log("\t\t" + _.map(txOuts,function (vout) {
                            return vout.value + '->' + vout.to;
                        }).join(','));

                        _.each(tx.vout, function (vout) {
                            console.log(vout.scriptPubKey);
                        });
                    });
//            client.getTxOut(txId, 1, function (err, unspent) {
//                if (err) {
//                    console.log(err);
//                }
//                console.log(unspent);
//            });
                });
            }));
        });

    }
});

//client.getTxOutSetInfo(function (err, unspent) {
//    if (err) {
//        console.log(err);
//    }
//    console.log(unspent);
//});

// another
// listtransactions
//client.listTransactions(null, 1, 0, function (err, t) {
//    console.log(t);
//});
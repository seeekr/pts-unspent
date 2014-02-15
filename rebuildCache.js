var bitcoin = require('bitcoin'), _ = require('underscore'), lib = require('./lib'), Q = require('q');
var fibrous = require('fibrous');
var client = new bitcoin.Client({
    host: 'localhost',
    port: 4321,
    user: 'protosharesrpc',
    pass: 'b42a0ae5c031fc31646213866bf902db'
});

var addressesByTxId = {};
var accountingByAddress = {};
var feesPaid = 0;
var minerCredits = {};

fibrous(function () {
    var c = client.sync.getBlockCount();
    var first = 0, last = c, dumpEvery = 100, blocksDone = 0;
    for (var i = first; i < last; i++) {
        var blockHash = client.sync.getBlockHash(i);
        var block = client.sync.getBlock(blockHash);
//        _.each(block.tx, function (txId) {
//            console.log("tx#" + txId);
//        });
        try {
            var firstTx = client.sync.getRawTransaction(block.tx[0], 1);
        } catch (e) {
            // ignore
            continue;
        }
        var addresses = lib.getOutAddresses(firstTx), minerAddr = addresses[0];
//        if (addresses.length != 1) {
//            console.log("!!! WARNING: more than one address in first tx in block !!!");
//            console.log(firstTx);
//        }

//        var txDeferreds = [];
        _.each(block.tx, function (txId, ix) {
//            var deferred = Q.defer();
//            txDeferreds.push(deferred.promise);
            tx = client.sync.getRawTransaction(txId, 1);
            feesPaid += lib.processTx(tx, addressesByTxId, accountingByAddress, minerAddr);
            minerCredits[minerAddr] = (minerCredits[minerAddr] || 0) + feesPaid;

//                deferred.resolve();
        });

//        Q.all(txDeferreds).done(function () {
        if (++blocksDone % dumpEvery == 0) {
            console.log("=== (" + blocksDone + " done - addresses, then accounting) ===");
//                console.log(addressesByTxId);
//                console.log(accountingByAddress);
            console.log(_.size(addressesByTxId));
            console.log(_.size(accountingByAddress));
            console.log(_.reduce(_.map(accountingByAddress, function (val) {
                return val;
            }), function (memo, num) {
                return memo + num;
            }));
            console.log(feesPaid);
            console.log(_.size(minerCredits));
            console.log("=== / ===");
        }
//        }, function (err) {
//            console.log(err, err.stack);
//        });
    }
})(function (err, d) {
    if (err) {
        console.log(err.stack || err);
        console.log(minerCredits);
    }
});
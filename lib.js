var _ = require('underscore'), EPSILON = .0000000001;

exports.getOutAddresses = function (tx) {
    return _.flatten(_.map(tx.vout, function (vout) {
        return vout.scriptPubKey.addresses;
    }));
};
exports.processTx = function (tx, addressesByTxId, accountingByAddress, minerAddr) {
    var txId = tx.txid;
    var sumIn = 0, txFeeInaccurate = false, isCreatingCurrency = false, dataBackup = {};
    // first remove old balances and transactions, and track sum of tx input values
    _.each(tx.vin, function (vin) {
        if (!vin.txid) {
            // this is a transaction that creates ("prints") currency, we can skip this step
            isCreatingCurrency = true;
            return;
        }
        if (!addressesByTxId[vin.txid]) {
            console.log("%%%% addr? tx#" + vin.txid);
            txFeeInaccurate = true;
            return;
        }
        sumIn += accountingByAddress[addressesByTxId[vin.txid][vin.vout]];

        dataBackup[addressesByTxId[vin.txid][vin.vout]] = accountingByAddress[addressesByTxId[vin.txid][vin.vout]];

        // balance spent so we can remove it (set it to 0)
        delete accountingByAddress[addressesByTxId[vin.txid][vin.vout]];
        // balance spent, no need to store the address for this particular tx out
        delete addressesByTxId[vin.txid][vin.vout];

        if (_.isEmpty(addressesByTxId[vin.txid])) {
            delete addressesByTxId[vin.txid];
        }
    });

    // now add new balances and remember addresses by tx id for reference later
    var addrs = addressesByTxId[txId];
    if (!addrs) {
        addrs = addressesByTxId[txId] = {};
    }
    var sumOut = 0;
    _.each(tx.vout, function (vout) {
        if (vout.scriptPubKey.addresses.length != 1) {
            console.log("!!! WARNING: vout has other than 1 target address !!! txId=" + txId);
            console.log(tx);
            console.log(vout.scriptPubKey);
        }
        var address = vout.scriptPubKey.addresses[0];
        addrs[vout.n] = address;
        accountingByAddress[address] = (accountingByAddress[address] || 0) + vout.value;

        sumOut += vout.value;
    });

    var valueDiff = sumIn - sumOut;
    if (valueDiff > 0 && minerAddr) {
//        console.log("@@ granting " + valueDiff + " to miner! (" + (valueDiff / sumIn) + "%)");
        // grant it to miner
        accountingByAddress[minerAddr] = (accountingByAddress[minerAddr] || 0) + valueDiff;
        return !txFeeInaccurate && !isCreatingCurrency && valueDiff;
    }
    if (valueDiff < 0 && Math.abs(valueDiff) >= EPSILON && !isCreatingCurrency) {
        throw _.extend(tx, {accData: dataBackup, sumIn: sumIn, sumOut: sumOut});
    }
    return 0;
};
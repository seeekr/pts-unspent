var lib = require('./../lib'), processTx = lib.processTx, acct = require('../ptsaccounting');

var testTransactions = {
    printCoins1: {
        txid: '1',
        vin: [
            { coinbase: '123' }
        ],
        vout: [
            { value: 50, n: 0, scriptPubKey: {addresses: ['P1']} }
        ]
    }
};

exports.testProcessTxPrintCoins1 = function (test) {
    var addressesByTx = {}, balance = {};

    processTx(testTransactions.printCoins1, addressesByTx, balance);

    test.deepEqual(addressesByTx, {
        '1': ['P1']
    });

    test.deepEqual(balance, {
        'P1': 50
    });

    processTx({
        txid: '2',
        vin: [
            {
                txid: '1', vout: 0
            }
        ],
        vout: [
            {value: 25, n: 0, scriptPubKey: {addresses: ['P2']}},
            {value: 20, n: 1, scriptPubKey: {addresses: ['P3']}}
        ]
    }, addressesByTx, balance, 'P1');

    test.deepEqual(addressesByTx, {
        '2': ['P2', 'P3']
    });

    test.deepEqual(balance, {
        'P1': 5,
        'P2': 25,
        'P3': 20
    });

    test.done();
};

exports.testGetBalances = function (test) {
    test.deepEqual(acct.getBalances({
        tx1_0: {
            address: 'P1',
            value: 1
        },
        tx2_0: {
            address: 'P1',
            value: 2
        },
        tx2_1: {
            address: 'P2',
            value: 5
        }
    }), [
        [ 'P1', 3 ],
        [ 'P2', 5 ]
    ]);

    test.done();
};

//exports.testProcessTx = function (test) {
//    var addressesByTx = {}, balance = {};
//
//    processTx({
//        txid: '1af4823281080d3eefdbef14cfc8cb0ee37f4968fd7d7ff6e67a3c434c8b5353',
//        vin: [
//            { txid: 'b7013ff32e319626c83a52c32954c1270154dfa8320764311074b07da46a6c3e',
//                vout: 0,
//                scriptSig: [Object],
//                sequence: 4294967295 },
//            { txid: 'a700361dacfa923edd90903905b5a2c910e292189d8b87b5d341ccce974ce65f',
//                vout: 0,
//                scriptSig: [Object],
//                sequence: 4294967295 }
//        ],
//        vout: [
//            { value: 1.02904, n: 0, scriptPubKey: [Object] },
//            { value: 0.01090468, n: 1, scriptPubKey: [Object] }
//        ],
//        blockhash: '00000035d45383cc2ba7a93b563f3abb707bcc9a882757e7026902b07881d7ef',
//        confirmations: 674,
//        time: 1392061514,
//        blocktime: 1392061514 }, {}, {});
//
//    test.done();
//};
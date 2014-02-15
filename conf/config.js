'use strict';

/**
 * Rules: override stuff locally in {file}-local.js; access stuff from {file}.js with require('./config').{file}.
 *
 * Example:
 * var config = require('./conf/config), bitcoindConf = config.bitcoind;
 *
 * @type {exports}
 * @private
 */

var _ = require('lodash');

var files = ['bitcoind'];

module.exports = _(files).reduce(function (conf, baseName) {
    _([baseName, baseName + '-local']).each(function (f) {
        try {
            var o = {};
            o[baseName] = require('./' + f + '.js');
            _.merge(conf, o);
        } catch (e) {
            // ignore
        }
    });
    return conf;
}, {});

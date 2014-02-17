var fs = require('fs'), _ = require('lodash');

module.exports = function (app) {
    app.get('/api/balance/list', function (req, res) {
        fs.readdir('cache/balance', function (err, files) {
            res.json(_.filter(files, function (f) {
                return f[0] != '.' && !/\.gz$/.test(f);
            }));
        });
    });

    app.get('/api/balance/file/:file', function (req, res) {
        res.sendfile('cache/balance/' + req.params.file, function (err) {
            if (err) {
                res.send(404, 'Data not available');
            }
        });
    });

    app.get('/api/balance/:year/:month/:day', function (req, res) {
        res.sendfile('cache/balance/' + req.params.year + '_' + req.params.month + '_' + req.params.day + '.json', function (err) {
            if (err) {
                res.send(404, 'Data not available');
            }
        });
    });
};
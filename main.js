var program = require('commander'), moment = require('moment')
    , fibrous = require('fibrous')
//    , accounting = require('./ptsaccounting')
    ;

function parseDate(val) {
    return moment.utc(val, 'YYYY-MM-DD');
}

program
    .version(process.version)
    .option('-d, --date [date]', 'Date of interest (midnight GMT)', parseDate)
    .parse(process.argv);

var date = program.date || moment.utc();

fibrous(function () {

    accounting.sync.prefetchBlockchain();

})(function (err) {
    console.log(err.stack || err);
});

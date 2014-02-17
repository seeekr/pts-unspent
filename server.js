var express = require('express'), app = express()
//    , open = require('open')
//    , fs = require('fs')
    , _ = require('lodash')
    ;

require('./routes/api')(app);

// serve static files
app.use('/download/balance', express.directory('cache/balance'));
app.use('/download/balance', express.static('cache/balance'));

app.listen(3000);

//open('http://localhost:3000/api/balance/2013/11/05');
var express = require('express'),
    app = express();

var oneDay = 86400000;

app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

var server = app.listen(8000, function() {
    var port = server.address().port;
    console.log('Express server listening on port %s.', port);
});

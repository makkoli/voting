var express = require('express'),
    MongoClient = require('mongodb').MongoClient,
    votingHelper = require('./votinghelper.js'),
    bodyParser = require('body-parser'),
    app = express();

var oneDay = 86400000;

// static files
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));
// parse body for posts
app.use(bodyParser.urlencoded({ extended: true }));
// views
app.set("views", __dirname + "/views");
app.set("view engine", "pug");

MongoClient.connect('mongodb://localhost:27017/voting', function(err, db) {
    if (err) {
        console.log(err);
    }

    // Page that contains a list of all polls
    app.get('/', function(req, res) {
        var query = {};
        var projection = { link: 1, name: 1 };

        db.collection('polls').find(query, projection).toArray(function(err, docs) {
            if (err) {
                console.log(err);
            }

            res.render("index", { polls: docs });
        });
    });

    // Load a page with the poll for the user to vote on
    app.get('/poll/:link', function(req, res) {
        var query =  { link: req.params.link };
        var projection = { _id: 0, name: 1, options: 1 };

        db.collection('polls').find(query, projection).toArray(function(err, docs) {
            if (err) {
                console.log(err);
            }

            var chartLabels = docs[0].options.map(function(curr) { return curr.name });
            var chartVotes = docs[0].options.map(function(curr) { return curr.votes });

            res.render("poll", { name: docs[0].name, labels: chartLabels,
                                votes: chartVotes, link: req.params.link });
        })
    });

    app.post('/poll/:link', function(req, res) {
        var query = { link: req.params.link, "options.name": req.body.option };
        var updateParam = { "$inc": { "options.$.votes": 1 } };
        console.log(req.body.option);

        db.collection('polls').updateOne(query, updateParam);
        res.end();
    });
});

var server = app.listen(8000, function() {
    var port = server.address().port;
    console.log('Express server listening on port %s.', port);
});

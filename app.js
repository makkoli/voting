var express = require('express'),
    MongoClient = require('mongodb').MongoClient,
    votingHelper = require('./votinghelper.js'),
    bodyParser = require('body-parser'),
    helmet = require('helmet'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    mongoose = require('mongoose'),
    bcrypt = require('bcrypt'),
    app = express();

// Connect mongoose to db
mongoose.connect('mongodb://localhost/voting');

// Scheme for users document -> to be moved to poll-model.js
var Schema = mongoose.Schema;
var UserDetail = new Schema(
    {
        username: String,
        password: String
    },
    {
        collection: 'users'
    }
);
var UserDetails = mongoose.model('users', UserDetail);

// Length of cache for static files
var oneDay = 86400000;

// static files
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));
// parse body for posts
app.use(bodyParser.urlencoded({ extended: true }));
// views
app.set("views", __dirname + "/views");
app.set("view engine", "pug");
// helmet for security
app.use(helmet());
// Parsing and session middleware
app.use(require('cookie-parser')());
app.use(require('express-session')({
    secret: 'Super Sekret Password',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
// Passport handling for local authentication
passport.use(new LocalStrategy(
    function(username, password, done) {
        process.nextTick(function() {
            UserDetails.findOne({
                'username': username
            }, function(err, user) {
                if (err) {
                    return done(err);
                }

                if (!user) {
                    return done(null, false, { message: 'Incorrect username.' });
                }

                if (user.password != password) {
                    return done(null, false, { message: 'Incorrect password.' });
                }

                return done(null, user);
            });
        });
    }
));

// Serialize and deserialize user instance
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

/*************** Get Page Requests ***************/
// Home page that contains a list of all polls
app.get('/', getPollList, function(req, res) {
    console.log(req.session);
    res.render("index", { polls: res.locals.polls });
});

// Load a page with the poll for the user to vote on
app.get('/poll/:link', getPollInfo, function(req, res) {
    res.render("poll", { name: res.locals.name, labels: res.locals.labels,
                        votes: res.locals.votes, link: req.params.link });
});

// Login page
app.get('/login', function(req, res) {
    res.render("login");
});

// Register page
app.get('/register', function(req, res) {
    res.render("register");
});


/*************** Post Page Requests ***************/
// Updates a poll after any user has voted on it
app.post('/poll/:link', [updatePollVote, getPollInfo], function(req, res) {
    res.render("poll", { name: res.locals.name, labels: res.locals.labels,
                        votes: res.locals.votes, link: req.params.link });
});

// Handle a user logging in
app.post('/login',
    passport.authenticate('local',
    {
        successRedirect: '/',
        failureRedirect: '/login'
    })
);

app.post('/register', function(req, res) {

});

/************************************************/

/**************** Middleware ****************/
// Gets all the polls in the database
function getPollList(req, res, next) {
    MongoClient.connect('mongodb://localhost:27017/voting', function(err, db) {
        if (err) {
            console.log(err);
        }

        var query = {};
        var projection = { link: 1, name: 1, _id: 0 };

        db.collection('polls').find(query, projection).toArray(function(err, docs) {
            if (err) {
                console.log(err);
            }

            res.locals.polls = docs;
            next();
        });
    })
};

// Gets the info for a specific poll
function getPollInfo(req, res, next) {
    MongoClient.connect('mongodb://localhost:27017/voting', function(err, db) {
        if (err) {
            console.log(err);
        }

        var query =  { link: req.params.link };
        var projection = { _id: 0, name: 1, options: 1 };

        db.collection('polls').find(query, projection).toArray(function(err, docs) {
            if (err) {
                console.log(err);
            }

            res.locals.name = docs[0].name;
            res.locals.labels = docs[0].options.map(function(curr) { return curr.name });
            res.locals.votes = docs[0].options.map(function(curr) { return curr.votes });
            next();
        });
    });
};

// Update a poll when a user votes
function updatePollVote(req, res, next) {
    MongoClient.connect('mongodb://localhost:27017/voting', function(err, db) {
        if (err) {
            console.log(err);
        }

        var query = { link: req.params.link, "options.name": req.body.option };
        var updateParam = { "$inc": { "options.$.votes": 1 } };

        db.collection('polls').updateOne(query, updateParam);
        next();
    });
};

/****************************************/

var server = app.listen(8000, function() {
    var port = server.address().port;
    console.log('Express server listening on port %s.', port);
});

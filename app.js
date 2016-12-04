var express = require('express'),
    MongoClient = require('mongodb').MongoClient,
    votingHelper = require('./votinghelper.js'),
    bodyParser = require('body-parser'),
    helmet = require('helmet'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    mongoose = require('mongoose'),
    User = require('./user-model'),
    Poll = require('./poll-model'),
    app = express();

var dbConnStr = 'mongodb://localhost:27017/voting';
// Connect mongoose to db
mongoose.connect(dbConnStr, function(err) {
    if (err) throw err;
    console.log('Connected to mongodb');
});

// Length of cache for static files
var oneDay = 86400000;

// static files
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));
// parse body for POST sent by user
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
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
// Passport handling for local authentication
passport.use(new LocalStrategy(
    function(username, password, done) {
        process.nextTick(function() {
            // Check if username exists
            User.findOne({
                'username': username.toLowerCase().trim()
            }, function(err, user) {
                if (err) {
                    return done(err);
                }

                // Username not found
                if (!user) {
                    console.log('invalid user');
                    return done(null, false);
                }

                // Check if password is correct
                var user = new User({
                    username: username
                });
                if (user.comparePassword(password)) {
                    console.log('invalid pass');
                    return done(null, false);
                }

                // Else, successful login
                return done(null, user);
            });
        });
    }
));

// Serialize and deserialize user instance
passport.serializeUser(function(user, done) {
    console.log(user);
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

/*************** Get Page Requests ***************/
// Home page that contains a list of all polls
app.get('/', function(req, res) {
    console.log(req.session);

    var query = {};
    var projection = "link name";
    var sort = { date: -1 };

    var sess = votingHelper.getLoginSession(req.session.passport);
    console.log(sess);

    Poll.find(query, projection, { sort: sort }, function(err, docs) {
        if (err) throw err;

        res.render('index', {
            logged: req.session.passport == undefined ? false : true,
            user: req.session.passport == undefined ? "" : req.session.passport.user.username,
            polls: docs
        });
    })
});

// Load a page with the poll for the user to vote on
app.get('/poll/:link', getPollInfo, function(req, res) {
    res.render('poll', { name: res.locals.name, labels: res.locals.labels,
                        votes: res.locals.votes, link: req.params.link });
});

// Login page
app.get('/login', function(req, res) {
    res.render("login");
});

// Register page
app.get('/register', function(req, res) {
    res.render('register', { error: "" });
});

// Get a users polls
app.get('/:user/polls', function(req, res) {
    var query = { creator: req.params.user };
    var projection = "link name";
    var sort = { date: -1 };

    Poll.find(query, projection, { sort: sort }, function(err, docs) {
        if (err) throw err;

        console.log(docs);

        res.render('user_polls', {
            polls: docs
        });
    });
});


/*************** Post Page Requests ***************/
// Updates a poll after any user has voted on it
app.post('/poll/:link', [updatePollVote, getPollInfo], function(req, res) {
    res.render('poll', { name: res.locals.name, labels: res.locals.labels,
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

// Register a new user
app.post('/register', function(req, res) {
    // check that fields are filled
    if (!(req.body.username && req.body.password)) {
        res.render('register', { error: "Username and password required" });
    }
    else {
        // Check if username is already in use
        User.findOne({ username: req.body.username }, function(err, user) {
            if (err) throw(err);

            // Redirect back to registration page if username in use
            if (user != null) {
                res.render('register', { error: "Username already taken" });
            }
            // Else, register new user
            else {
                var user = new User({
                    username: req.body.username,
                    password: req.body.password
                });

                user.save(function(err) {
                    if (err) throw err;

                    res.render('template',
                        { message: "Registration Successful" });
                });
            }
        });
    }
});

/************************************************/

/**************** Middleware ****************/

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

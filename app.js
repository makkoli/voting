var express = require('express'),
    MongoClient = require('mongodb').MongoClient,
    votingHelper = require('./helper/votinghelper').votingHelper,
    bodyParser = require('body-parser'),
    helmet = require('helmet'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    mongoose = require('mongoose'),
    User = require('./models/user-model'),
    Poll = require('./models/poll-model'),
    app = express();

var dbConnStr = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/voting';
var port = process.env.PORT || 8000;
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
    cookie: {
        maxAge: oneDay * 365    // year expiration
    }
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
                    return done(null, false);
                }

                // Check if password is correct
                var user = new User({
                    username: username
                });
                if (user.comparePassword(password)) {
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
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

/*************** Get Page Requests ***************/
// Home page that contains a list of all polls
app.get('/', getLoginSession, function(req, res) {
    console.log(req.session);

    // Query parameters to get all polls in db
    var query = {};
    var projection = "link name";
    var sort = { date: -1 };

    // Get all the polls in the database
    Poll.find(query, projection, { sort: sort }, function(err, docs) {
        if (err) throw err;

        res.render('index', {
            logged: res.locals.logged,
            user: res.locals.user,
            polls: docs
        });
    })
});

// Load a page with the poll for the user to vote on
app.get('/poll/:link', [checkPollVotedOn, getLoginSession], function(req, res) {
    var query =  { link: req.params.link };
    var projection = { _id: 0, name: 1, options: 1 };

    Poll.findOne(query, projection, function(err, doc) {
        if (err) throw err;

        res.render('poll', {
            logged: res.locals.logged,
            user: res.locals.user,
            name: doc.name,
            labels: doc.options.map(function(curr) { return curr.name; }),
            votes: doc.options.map(function(curr) { return curr.votes; }),
            link: req.params.link,
            votedOn: res.locals.voted,
            error: res.locals.voted ? "You have already voted" : ""
        });
    });
});

// Login page
app.get('/login', getLoginSession, function(req, res) {
    if (res.locals.logged) {
        res.redirect('/');
    }
    else {
        res.render('login');
    }
});

// Logout a user
app.get('/logout', getLoginSession, function(req, res) {
    if (!res.locals.logged) {
        res.render('template', { message: "You are not logged in" });
    }
    else {
        req.logout();
        req.session.passport = undefined;
        res.render('template', {
            logged: false,
            user: "",
            message: "You have logged out"
        });
    }
});

// Register page
app.get('/register', getLoginSession, function(req, res) {
    if (res.locals.logged) {
        res.redirect('/');
    }
    else {
        res.render('register', { error: "" });
    }
});

// Get a users polls
app.get('/:user/polls', getLoginSession, function(req, res) {
    // Redirect to unauthorized access if not logged in or different user
    if (!res.locals.logged || res.locals.user != req.params.user) {
        res.render('template', { message: "404: Not Found" });
    }

    var query = { creator: req.params.user };
    var projection = "link name";
    var sort = { date: -1 };

    Poll.find(query, projection, { sort: sort }, function(err, docs) {
        if (err) throw err;

        res.render('user_polls', {
            logged: res.locals.logged,
            user: res.locals.user,
            polls: docs
        });
    });
});

// Get the create poll page
app.get('/:user/create', getLoginSession, function(req, res) {
    // Redirect to unauthorized access if not logged in or different user
    if (!res.locals.logged || res.locals.user != req.params.user) {
        res.render('template', { message: "404: Not Found" });
    }

    res.render('create_poll', {
        logged: res.locals.logged,
        user: res.locals.user
    });
});

// Get the details for a users poll
app.get('/:user/polls/:link', getLoginSession, function(req, res) {
    var query =  { link: req.params.link };
    var projection = { _id: 0, name: 1, options: 1 };

    Poll.findOne(query, projection, function(err, doc) {
        if (err) throw err;

        res.render('poll_details', {
            logged: res.locals.logged,
            user: res.locals.user,
            name: doc.name,
            labels: doc.options.map(function(curr) { return curr.name; }),
            totalVotes: doc.options.reduce(function(total, next) { return total + next.votes; }, 0),
            votes: doc.options.map(function(curr) { return curr.votes; }),
            link: req.params.link
        });
    });
});


/*************** Post Page Requests ***************/
// Updates a poll after any user has voted on it
app.post('/poll/:link', function(req, res) {
    var query = { link: req.params.link, "options.name": req.body.option };
    var updateParam = { "$inc": { "options.$.votes": 1 } };

    Poll.update(query, updateParam, null, function(err) {
        if (err) throw err;

        // Create polls voted on array if doesn't exist
        if (req.session.hasOwnProperty('votedOn')) {
            req.session.votedOn = [req.params.link];
        }
        // Else, add poll to polls the user has voted on
        else {
            req.session.votedOn.push(req.params.link);
        }
        // Redirect back to updated poll page
        res.redirect('/poll/' + req.params.link);
    });
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

// Add a new poll to the database
app.post('/:user/create', getLoginSession, function(req, res) {
    // Check for a question
    if (!req.body.question) {
        res.render('create_poll', {
            logged: res.locals.logged,
            user: res.locals.user,
            error: "Question is required"
        });
    }
    // Check for at least 2 answers
    else if (!(req.body.option_1 && req.body.option_2)) {
        res.render('create_poll', {
            logged: res.locals.logged,
            user: res.locals.user,
            error: "At least 2 options are required"
        });
    }
    // Else, add the new poll to the database
    else {
        var pollLink = new votingHelper().generateId();
        var pollOptions = [];
        var i = 1;
        var currentOption = "option_" + i;

        // Add all the options inputted by user
        while(req.body.hasOwnProperty(currentOption)) {
            pollOptions.push({
                name: req.body[currentOption],
                votes: 0
            });

            i++;
            currentOption = "option_" + i;
        }

        // Poll document to add
        var poll = new Poll({
            name: req.body.question,
            options: pollOptions,
            link: pollLink,
            creator: req.params.user,
            date: Date.now()
        });

        // Save the new poll to the database
        poll.save(function(err) {
            if (err) throw err;

            res.redirect('/poll/' + pollLink);
        });
    }
});

// Deletes a poll from the database
app.post('/:user/polls/:link/delete', function(req, res) {
    var query = { link: req.params.link };

    Poll.findOneAndRemove(query, function(err) {
        if (err) throw err;

        res.redirect('/' + req.params.user + '/polls');
    })
});

// Update the options in a user's poll
app.post('/:user/polls/:link', function(req, res) {
    var query = { link: req.params.link };
    var updateParam = { "$addToSet": { "options": { "name" : req.body.option, "votes": 0 } } };

    Poll.update(query, updateParam, null, function(err) {
        if (err) throw err;

        res.redirect('/' + req.params.user + '/polls/' + req.params.link);
    });
});

/************************************************/

/**************** Middleware ****************/

// Gets login session for proper rendering
function getLoginSession(req, res, next) {
    res.locals.logged = req.session.passport == undefined ? false : true,
    res.locals.user = req.session.passport == undefined ? "" : req.session.passport.user.username

    next();
};

// Checks if the poll has been voted on by the user
function checkPollVotedOn(req, res, next) {
    // Add the votedOn attribute to session if not already there
    if (!req.session.hasOwnProperty('votedOn')) {
        req.session.votedOn = [];
    }

    if (req.session.votedOn.some(function(ele) {
        return ele == req.params.link;
    })) {
        res.locals.voted = true;
    }
    else {
        res.locals.voted = false;
    }

    next();
}

/****************************************/

var server = app.listen(port, function() {
    var port = server.address().port;
    console.log('Express server listening on port %s.', port);
});

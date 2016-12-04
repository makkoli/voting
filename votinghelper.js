// a collection of utility functions

function votingHelper() {
    // Generates a random 10 character id
    generateId = function() {
        var id = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 10; i++) {
            id += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return id;
    },

    getLoginSession = function(session) {
        if (session == undefined) {
            return null;
        }

        return {
            logged: req.session.passport == undefined ? false : true,
            user: req.session.passport == undefined ? "" : req.session.passport.user.username
        };
    }
}

module.exports.votingHelper = votingHelper;

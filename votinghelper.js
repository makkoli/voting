var exports = module.exports = {};

// Generates a random 10 character id
exports.generateId = function() {
    var id = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++) {
        id += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return id;
}

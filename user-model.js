var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

// define the schema for mongo
var UserSchema = new Schema({
    username: {
        type: String,
        trim: true,
        lowercase: true,
        required: true,
        index: { unique: true }
        },
    password: {
        type: String,
        required: true
        },
    voted_on: [String]
    },
    {
        collection: 'users'
    }
);

// salt and hash the password before saving to database
UserSchema.pre('save', function(next) {
    var user = this;

    //only hash password if it was modified or new
    if (!user.isModified('password')) return next();

    // generate a salt
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        // hash the password with the new salt
        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            // override cleartext password with the hashed one
            user.password = hash;
            next();
        });
    });
});

// compare the input password from one stored in the database
UserSchema.methods.comparePassword = function(candidatePassword) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return err;
        return isMatch;
    });
};

module.exports = mongoose.model('User', UserSchema);

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

// define poll Schema
var PollSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    options: [
        {
            name: {
                type: String,
                required: true
            },
            votes: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ],
    link: {
        type: String,
        required: true,
        index: { unique: true }
    },
    creator: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    }
    },
    {
        collection: 'polls'
    }
);


module.exports = mongoose.model('Poll', PollSchema);

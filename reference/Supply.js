const mongoose = require('mongoose');

const supplySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    vendor: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    note: {
        type: String
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Supply', supplySchema); 
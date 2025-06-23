// models/FirstOp.js
const mongoose = require('mongoose');

const firstOpSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    chartNumber: {
        type: String,
        required: true
    },
    patientName: {
        type: String,
        required: true
    },
    doctor: {
        type: String,
        required: true
    },
    implants: [{
        manufacturer: {
            type: String,
            required: true
        },
        specification: {
            type: String,
            required: false
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    fixtures: [{
        type: {
            type: String,
            required: true
        },
        specification: {
            type: String,
            required: false
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FirstOp', firstOpSchema);
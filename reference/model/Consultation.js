const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
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
    staff: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    agreed: {
        type: Boolean,
        default: false
    },
    confirmedDate: {
        type: Date,
        default: null
    },
    notes: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Consultation', consultationSchema); 
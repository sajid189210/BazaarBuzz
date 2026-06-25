const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    otpNumber: { type: Number },
    expiry: { type: Date },
    isVerified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('otp', otpSchema);
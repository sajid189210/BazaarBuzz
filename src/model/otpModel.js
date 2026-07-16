const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    otpNumber: { type: Number },
    expiry: { type: Date },
    isVerified: { type: Boolean, default: false },
    purpose: { type: String, enum: ['signup', 'passwordReset'], default: 'signup' }
}, { timestamps: true });

module.exports = mongoose.model('otp', otpSchema);
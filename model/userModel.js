const mongoose = require('mongoose');
const addressSchema = require('./addressModel');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePicture: { type: String },
    addressId: {
        type: [addressSchema],
        default: [],
    },
    isBlocked: {
        type: String,
        default: 'unblocked'
    },
    otp: { type: Number },
    otpExpires: { type: Date },
}, { timestamps: true });



module.exports = mongoose.model('user', userSchema);
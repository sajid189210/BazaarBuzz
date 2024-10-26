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
    password: { type: String },
    profilePicture: { type: String },
    addressId: {
        type: [addressSchema],
        default: [],
    },
    isBlocked: {
        type: String,
        default: 'unblocked'
    },
    googleId: { type: String },
}, { timestamps: true });

const User = mongoose.model('user', userSchema);

module.exports = User;
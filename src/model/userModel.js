const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    contactNumber: { type: String },
    contactName: { type: String },
    building: { type: String, },
    district: { type: String, },
    landmark: { type: String },
    pincode: { type: String },
    street: { type: String },
    state: { type: String },
});

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
    phone: { type: String },
    addressId: {
        type: [addressSchema],
        default: [],
    },
    usedCoupons: [
        {
            couponId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Coupon"
            },
            couponCode: { type: String },
            couponValue: { type: Number },
            count: { type: Number, default: 0 }
        }
    ],
    isBlocked: {
        type: String,
        default: 'unblocked'
    },
    googleId: { type: String },
}, { timestamps: true });

const User = mongoose.model('user', userSchema);

userSchema.index({ googleId: 1 });
userSchema.index({ isBlocked: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });

module.exports = User;
const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: { type: String, unique: true },
    couponType: { type: String },
    couponValue: { type: Number },
    minAmount: { type: Number },
    expiry: { type: Date },
    count: { type: Number },
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
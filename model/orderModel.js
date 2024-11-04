const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    orderedProducts: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            },
            quantity: { type: Number },
            selectedSize: { type: String },
            selectedColor: { type: String },
            discountedPrice: { type: Number },
            couponAdded: {
                type: Number,
                default: 0
            },
            totalPay: {     // (discountedPrice * quantity) - couponAdded
                type: Number,
                required: true
            },
            orderStatus: {
                type: String,
                enum: ['processing', 'shipped', 'cancelled', 'returned', 'delivered', 'pending'],
                default: 'processing'
            },
            paymentStatus: {
                type: String,
                enum: ['pending', 'paid', 'failed', 'refunded'],
            },
            returnStatus: {
                type: String,
                enum: ['requested', 'approved', 'returned', 'rejected', 'refunded'],
            },
            returnReason: { type: String },
            returnPaymentMethod: {
                type: String,
                enum: ['cod', 'razorpay', 'wallet']
            },
            returnPaymentStatus: {
                type: String,
                enum: ['pending', 'paid', 'failed', 'refunded']
            },
        }
    ],
    paymentMethod: {
        type: String,
        enum: ['cod', 'razorpay', 'wallet'],
    },
    allOrdersStatus: {
        type: String,
        enum: ['processing', 'shipped', 'cancelled', 'returned', 'delivered'],
        default: 'processing'
    },
    shippingAddress: {
        contactName: { type: String },
        contactNumber: { type: String },
        building: { type: String },
        district: { type: String },
        landmark: { type: String },
        pincode: { type: String },
        street: { type: String },
        state: { type: String }
    },
    shippingFee: {
        type: Number,
        default: 0
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon'
    }

}, { timestamps: true });

const Order = mongoose.model('order', orderSchema);
module.exports = Order;
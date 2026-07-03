const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
            quantity: {
                type: Number,
                default: 1,
                min: [1, "Product quantity must be greater than or equal to 1."]
            },
            selectedColor: { type: String },
            selectedSize: { type: String },
            discountedPrice: {
                type: Number,
                default: 0,
                min: [0, "Discounted Price must not be a negative."]
            },
            offer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Offer',
                default: null
            },
        }
    ],
    discountedValue: { //for coupons
        type: Number,
        default: 0,
        min: [0, "Discounted Coupon value must not be a negative."]

    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
    },
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;


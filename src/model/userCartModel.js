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
                default: 1
            },
            selectedColor: { type: String },
            selectedSize: { type: String },
            discountedPrice: { //for discounts
                type: Number,
                default: 0
            },
            offer:{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Offer',
            }
        }
    ],
    discountedValue: { //for coupons
        type: Number,
        default: 0
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
    }
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;


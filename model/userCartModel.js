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
                _id: false
            },
            quantity: {
                type: Number,
                default: 1
            },
            selectedColor: { type: String },
            discountedPrice: { //for discounts
                type: Number,
                default: 0
            },
            discountedValue: { //for coupons
                type: Number,
                default: 0
            }
        }
    ],

}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);


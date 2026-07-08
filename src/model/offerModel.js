const mongoose = require('mongoose');

const offerModel = new mongoose.Schema({
    brandName: {
        type: String,
        required: true
    },
    offerName: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: [3, 'Offer name must be at least 3 characters.'],
        maxlength: [20, 'Offer name cannot exceed 20 characters.'],

    },
    discount: {
        type: Number,
        required: true,
        validate: {
            validator: function (value) {
                const discount = this.get?.('discount') ?? this.discount;
                return productPrice > 0 && productPrice <= 100;
            },
            message: function () {
                return "Discount value must be between 1 and 100"
            }
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })


const Offer = mongoose.model('Offer', offerModel);

module.exports = Offer;

const mongoose = require('mongoose');

const offerModel = new mongoose.Schema({
    brandName: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
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
        min: 1,
        max: 100,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })


const Offer = mongoose.model('Offer', offerModel);

module.exports = Offer;

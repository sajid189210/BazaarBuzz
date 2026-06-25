const mongoose = require('mongoose');

const offerModel = new mongoose.Schema({
    brandName: {
        type: String,
        required: true
    },
    offerName: {
        type: String,
        required: true,
        unique: true
    },
    discount: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })


const Offer = mongoose.model('Offer', offerModel);

module.exports = Offer;

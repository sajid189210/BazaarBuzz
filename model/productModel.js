const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
    },
    productPrice: {
        type: Number,
        required: true
    },
    productQuantity: {
        type: Number,
        required: true,
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    image: {
        type: Array,
        required: true

    },
    stock: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    productDesc: { type: String },
    productDiscount: { type: Number },
    color: { type: Array },
    size: { type: Array },
}, { timestamps: true });

const Products = mongoose.model('Product', productSchema);

module.exports = Products;
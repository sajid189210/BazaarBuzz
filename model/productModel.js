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
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    stock: {
        type: Number,
        required: true
    },
    discount: { type: Number },
    brand: { type: String },
    images: [{ type: String }],
    colors: [{ type: String }],
    description: { type: String },
    fabric: { type: String },
    size: { type: String },
    gender: { type: String },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Products = mongoose.model('Product', productSchema);

module.exports = Products;
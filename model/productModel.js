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
    discount: { type: Number },
    brand: { type: String },
    images: [{ type: String }],
    description: { type: String },
    fabric: { type: String },
    gender: { type: String },
    variants: [
        {
            size: { type: String },
            stock: { type: Number },
            colors: [{ type: String }],

        }
    ],
    featured: {
        type: Boolean,
        default: false
    },
    limitedEdition: {
        type: Boolean,
        default: false
    },
    wishlisted: {
        type: Boolean,
        default: false
    },
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
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        trim: true,
    },
    productPrice: {
        type: Number,
        required: true,
        min: [1, 'Minimum amount must be greater than or equal to 1'],
        max: [10000, 'Minimum amount must be between 1 and 10000.']
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    discount: {
        type: Number,
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
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
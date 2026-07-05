const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        minlength: [2, 'Product name must be at least 2 characters'],
        maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    productPrice: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [1, 'Price must be greater than or equal to 1'],
        max: [10000, 'Price cannot exceed 10000']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
        lowercase: true,
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%'],
        validate: {
            validator: function (value) {
                return value >= 0 && value <= 100;
            },
            message: 'Discount must be between 0 and 100'
        }
    },
    brand: {
        type: String,
        required: [true, 'Brand is required'],
        trim: true,
        lowercase: true,
    },
    images: [{
        type: String,
        required: [true, 'At least one product image is required'],
        validate: {
            validator: function (v) {
                return v && v.length > 0;
            },
            message: 'At least one product image is required'
        }
    }],
    description: {
        type: String,
        required: [true, 'Product description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    fabric: {
        type: String,
        required: [true, 'Fabric information is required'],
        trim: true,
        maxlength: [100, 'Fabric description cannot exceed 100 characters']
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: {
            values: ['men', 'women', 'unisex', 'kids'],
            message: 'Gender must be one of: men, women, unisex, kids'
        }
    },
    variants: [{
        size: {
            type: String,
            required: [true, 'Size is required for each variant'],
            trim: true,
            enum: {
                values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
                message: 'Size must be a valid size option'
            }
        },
        stock: {
            type: Number,
            required: [true, 'Stock quantity is required for each variant'],
            min: [0, 'Stock cannot be negative'],
        },
        colors: [{
            type: String,
            required: [true, 'At least one color is required for each variant'],
            trim: true,
            lowercase: true
        }]
    }],
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

// Add a pre-save middleware to ensure at least one variant exists
productSchema.pre('save', function (next) {
    if (!this.variants || this.variants.length === 0) {
        return next(new Error('At least one product variant is required'));
    }

    // Validate each variant has at least one color
    for (const variant of this.variants) {
        if (!variant.colors || variant.colors.length === 0) {
            return next(new Error('Each variant must have at least one color'));
        }
    }

    next();
});

// Add a pre-save middleware to ensure at least one image exists
productSchema.pre('save', function (next) {
    if (!this.images || this.images.length === 0) {
        return next(new Error('At least one product image is required'));
    }
    next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

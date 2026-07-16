const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [2, 'Category name must be at least 2 characters'],
        maxlength: [50, 'Category name must be at most 50 characters']
    },
    brands: {
        type: [String],
        required: [true, 'At least one brand is required'],
        validate: {
            validator: function (arr) {
                return arr && arr.length > 0 && arr.every(b => b && b.trim().length > 0);
            },
            message: 'At least one brand is required and brands cannot be empty.'
        },
        set: function (arr) {
            const seen = new Set();
            return (arr || [])
                .map(b => (b || '').trim().toLowerCase())
                .filter(b => {
                    if (!b) return false;
                    const key = b.toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
        }
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

const Category = mongoose.model("Category", categorySchema);

categorySchema.index({ isDeleted: 1, isActive: 1 });
categorySchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = Category;

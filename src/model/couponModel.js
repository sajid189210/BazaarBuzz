const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        match: [/^[A-Z0-9]+$/, 'Coupon code can contain only letters and numbers.'],
        minlength: [3, 'Coupon code must be at least 3 characters.'],
        maxlength: [20, 'Coupon code cannot exceed 20 characters.'],
    },
    couponType: {
        type: String,
        required: true,
        enum: ['price', 'percentage'],
    },
    couponValue: {
        type: Number,
        required: true,
        validate: {
            validator: function (value) {
                const couponType = this.get?.('couponType') ?? this.couponType;

                if (couponType === 'price') {
                    return value >= 1 && value <= 10000;
                }

                if (couponType === 'percentage') {
                    return value >= 1 && value <= 100;
                }


                return false;
            },
            message: function () {
                const couponType = this.get?.('couponType') ?? this.couponType;

                if (couponType === 'price') {
                    return 'Coupon value must be between 1 and 10000.';
                }

                if (couponType === 'percentage') {
                    return 'Coupon value must be between 1 and 100.';
                }

                return 'Invalid coupon value.';
            }
        }
    },
    minAmount: {
        type: Number,
        required: true,
        min: [1, 'Minimum amount must be greater than or equal to 1'],
        max: [10000, 'Minimum amount must be between 1 and 100000.']
    },
    expiry: {
        type: Date,
        required: true,
        validate: {
            validator(value) {
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);

                const expiry = new Date(value);
                expiry.setUTCHours(0, 0, 0, 0);

                return expiry >= today;
            },
            message: 'Expiry date must be today or a future date.'
        }
    },
    count: {
        type: Number,
        required: true,
        min: [1, 'Coupon count must be at least 1'],
        max: [10000, 'Coupon count cannot exceed 10000']

    },
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
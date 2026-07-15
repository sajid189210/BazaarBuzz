const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    type: {
        type: String,
        enum: ['user', 'admin'],
        required: true,
    },
    balance: {
        type: Number,
        default: 0,
    },
    currency: {
        type: String,
        default: 'INR'
    },
    transactions: [
        {
            orderId: {
                type: String,
            },

            amount: {
                type: Number,
                required: true,
            },

            date: {
                type: Date,
                default: Date.now,
            },

            type: {
                type: String,
                enum: ["credit", "debit"],
                required: true,
            },

            refunded: {
                type: Boolean,
                default: false,
            },
        },
    ],
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;

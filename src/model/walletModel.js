const mongoose = require('mongoose');
const { WALLET_TYPE_USER, WALLET_TYPE_ADMIN } = require('../constants/walletTypes');
const { PAYMENT_SOURCE_COD, PAYMENT_SOURCE_RAZORPAY, PAYMENT_SOURCE_WALLET } = require('../constants/paymentSources');

const walletSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    type: {
        type: String,
        enum: [WALLET_TYPE_USER, WALLET_TYPE_ADMIN],
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

            source: {
                type: String,
                enum: [PAYMENT_SOURCE_COD, PAYMENT_SOURCE_RAZORPAY, PAYMENT_SOURCE_WALLET],
            },
            refunded: {
                type: Boolean,
                default: false,
            },
        },
    ],
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

walletSchema.index({ owner: 1, type: 1 });
walletSchema.index({ type: 1 });

module.exports = Wallet;

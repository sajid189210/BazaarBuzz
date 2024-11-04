const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'user'
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
            orderId: { type: String },
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
                enum: ['credit', 'debit'],
            },
            refunded: { type: Boolean, default: false }
        },
    ],
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;

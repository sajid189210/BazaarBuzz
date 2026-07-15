const response = require('../../Services/responseMapper');
const { WALLET_TYPE_USER } = require('../../constants/walletTypes');
const Wallet = require('../../model/walletModel');
const Category = require('../../model/categoryModel');

const razorpayInstance = require('../../Services/razorPay');

const renderWallet = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');
        const userId = req.session.user.userId;

        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;

        let wallet = await Wallet.findOne({ owner: userId, type: WALLET_TYPE_USER });

        const categories = await Category.find();

        if (!wallet) {
            const newWallet = new Wallet({ owner: userId, type: WALLET_TYPE_USER, balance: 0 });
            await newWallet.save();
            wallet = newWallet;
        }

        const sortedTransactions = wallet.transactions.sort((a, b) => b.date - a.date);
        const totalTransactions = sortedTransactions.length;

        let runningBalance = wallet.balance;
        const enriched = sortedTransactions.map(txn => {
            const t = txn.toObject();
            if (t.type === 'credit') {
                t.balanceBefore = Math.round((runningBalance - t.amount) * 100) / 100;
                t.balanceAfter = runningBalance;
                runningBalance = t.balanceBefore;
            } else {
                t.balanceBefore = Math.round((runningBalance + t.amount) * 100) / 100;
                t.balanceAfter = runningBalance;
                runningBalance = t.balanceBefore;
            }
            return t;
        });

        const paginatedTransactions = enriched.slice((page - 1) * limit, page * limit);

        res.render('user/userWallet', {
            title: 'My Wallet',
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages: Math.ceil(totalTransactions / limit),
            searchBox: false,
            categories,
            wallet,
            limit,
            user: req.session.user || null,
        });

    } catch (err) {
        response.serverError(res, err);}
};

const createRazorpayOrder = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;
        const walletMoneyInput = parseInt(req.body.walletMoneyInput, 10);

        if (isNaN(walletMoneyInput) || walletMoneyInput <= 0) {
            return response.error(res, "Please input a valid amount greater than 0.", 400);
        }

        const totalAmount = walletMoneyInput * 100;

        const razorpayOrder = await razorpayInstance.orders.create({
            amount: totalAmount,
            currency: 'INR',
            receipt: `receipt_${new Date().getTime()}`,
            payment_capture: 1,
        });

        response.success(res, {
            success: true,
            order: razorpayOrder,
            key_id: process.env.RAZORPAY_KEY_ID,
            amount: totalAmount,
            currency: 'INR',
        });

    } catch (err) {
        response.serverError(res, err);}
};

module.exports = {
    createRazorpayOrder,
    renderWallet,
}
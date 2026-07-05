const response = require('../../Services/responseMapper');
const Wallet = require('../../model/walletModel');
const Category = require('../../model/categoryModel');

const razorpayInstance = require('../../Services/razorPay');

const renderWallet = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');
        const userId = req.session.user.userId;

        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;

        let wallet = await Wallet.findOne({ user: userId });

        const categories = await Category.find();

        if (!wallet) {
            const newWallet = new Wallet({ user: userId, balance: 0 });
            await newWallet.save();
            wallet = newWallet;
        }

        // sort transactions and apply pagination.
        const sortedTransactions = wallet.transactions.sort((a, b) => b.date - a.date);
        const paginatedTransactions = sortedTransactions.slice((page - 1) * limit, page * limit);

        const totalTransactions = sortedTransactions.length;

        res.render('user/userWallet', {
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
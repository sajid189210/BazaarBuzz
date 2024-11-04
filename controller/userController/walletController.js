const Wallet = require('../../model/walletModel');
const Category = require('../../model/categoryModel');

const razorpayInstance = require('../../Services/razorPay');

const renderWallet = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;

        const wallet = await Wallet.findOne({ user: userId }).sort({ 'transactions.createdAt': -1 });
        const category = await Category.find();

        if (!wallet) {
            const createWallet = new Wallet({ user: userId, balance: 0 });
            await createWallet.save();
        }

        res.render('user/userWallet', {
            user: req.session.user || null,
            category,
            wallet
        });

    } catch (err) {
        console.error(`Error caught renderWallet in the walletController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const createRazorpayOrder = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/user/signIn');

        // const userId = req.session.user.userId;

        // Parse the walletMoneyInput correctly from the request body
        const walletMoneyInput = parseInt(req.body.walletMoneyInput, 10); //? Specify the base.

        const totalAmount = walletMoneyInput * 100;

        const option = {
            amount: totalAmount,
            currency: 'INR',
            receipt: `receipt_${new Date().getTime()}`,
            payment_capture: 1,
        };

        // razorpayInstance.orders
        // // Validate the input
        // if (isNaN(walletMoneyInput) || walletMoneyInput <= 0) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Please input a valid amount greater than 0."
        //     });
        // }

        // const wallet = await Wallet.findOne({ user: userId });

        // if (!wallet) {
        //     // Create a new wallet if it doesn't exist
        //     const createWallet = new Wallet({ user: userId, balance: wallet.balance + walletMoneyInput });
        //     await createWallet.save();
        // } else {
        //     // Update the existing wallet balance
        //     wallet.balance += walletMoneyInput;
        //     await wallet.save();
        // }

        // res.status(200).json({
        //     success: true,
        //     message: "Amount successfully added.",
        //     balance: wallet.balance
        // });

    } catch (err) {
        console.error(`Error caught proceedToPayment in the checkoutController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

module.exports = {
    createRazorpayOrder,
    renderWallet,
}
const Category = require('../../model/categoryModel');
const Wallet = require('../../model/walletModel');
const Order = require('../../model/orderModel');
const User = require('../../model/userModel');

const getOrders = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;

        const category = await Category.find();

        const orders = await Order.find({ user: userId }).populate('orderedProducts.product').sort({ createdAt: -1 });

        res.render('user/userOrders', {
            user: req.session.user || null,
            orders,
            category
        })

    } catch (err) {
        console.error(`Error caught getOrders in the cartController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
}

const returnProduct = async (req, res) => {
    const { productId, orderItemId, reason } = req.body;
    try {

        const hasReturned = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            { $set: { 'orderedProducts.$.returnStatus': 'requested', 'orderedProducts.$.returnReason': reason } },
            { new: true }
        );

        if (!hasReturned) return res.status(400).json({
            success: false,
            message: 'Error handling return...'
        });

        res.status(200).json({
            success: true,
            message: 'Order successfully requested for return. Order will be returned when approved.'
        })

    } catch (err) {
        console.error(`Error caught returnProducts in the cartController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const cancelProduct = async (req, res) => {
    const { productId, orderItemId, orderId } = req.body;

    // Redirect if the user is not authenticated
    if (!req.session.user) return res.redirect('/user/signIn');

    const userId = req.session.user.userId;

    try {
        //* find user and order.
        const user = await User.findOne({ _id: userId });
        const order = await Order.findOne({ _id: orderId }).populate('coupon');

        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        if (!order) return res.status(404).json({ success: false, message: "Order not found." });

        const { paymentMethod, orderedProducts } = order;

        // prepping the update details based on payment method
        const updateDetails = {
            'orderedProducts.$.orderStatus': 'cancelled',
            'orderedProducts.$.paymentStatus': paymentMethod === 'razorpay' || paymentMethod === 'wallet' ? 'refunded' : 'failed'
        };

        //* updating the order status
        const updatedOrder = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            { $set: updateDetails },
            { new: true }
        );

        // checking if all products are cancelled.
        let isAllCancelled = updatedOrder.orderedProducts.every(product => product.orderStatus === 'cancelled');

        //* Update the overall order status if all products are cancelled
        if (isAllCancelled) {
            await Order.findByIdAndUpdate(
                orderId,
                { $set: { allOrdersStatus: 'cancelled' } },
                { new: true }
            );
        }

        //* Handle online payment refunds
        if (paymentMethod === 'razorpay' || paymentMethod === 'wallet') {
            let totalAmount = orderedProducts.reduce((acc, product) => acc + product.totalPay, 0);
            if (order.coupon) totalAmount -= order.coupon.couponValue;

            const updateWalletBalance = await Wallet.findOneAndUpdate(
                { user: userId },
                { $inc: { balance: totalAmount } },
                { new: true }
            );

            if (!updateWalletBalance) {
                return res.status(400).json({
                    success: false,
                    message: 'Refund has failed.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'You have cancelled the product. Money has been refunded into your wallet.'
            });
        }

        //* Return if payment method is COD
        return res.status(200).json({
            success: true,
            message: 'You have cancelled the product.'
        });

    } catch (err) {
        console.error(`Error caught cancelProduct in the cartController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


module.exports = {
    returnProduct,
    cancelProduct,
    getOrders,
}
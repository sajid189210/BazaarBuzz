const Wallet = require('../../model/walletModel');
const Order = require('../../model/orderModel');

const renderOrderList = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        let filter = {};

        if (search) {
            // Ensure the search term is a valid ObjectId format
            if (/^[0-9a-fA-F]{24}$/.test(search)) {
                filter._id = search;  // Search by _id
            } else {
                // Optionally, handle invalid ObjectId search input
                return res.status(400).json({ error: "Invalid ObjectId format" });
            }
        }

        const orders = await Order.find(filter)
            .populate('user')
            .populate('orderedProducts.product')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const totalOrders = await Order.countDocuments();

        res.render('admin/adminOrderList', {
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            orders,
            limit,
        });

    } catch (err) {
        console.error(`Error caught renderOrderList in the admin OrderController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const renderOrderView = async (req, res) => {
    const { orderId } = req.query;

    if (!req.session.admin) return res.redirect('/admin/signIn');
    try {
        const order = await Order.findById(orderId).populate('orderedProducts.product').populate('coupon');

        res.render('admin/adminOrderView', { order });

    } catch (err) {
        console.error(`Error caught renderOrderView in the admin OrderController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
}

const changeStatus = async (req, res) => {
    const { orderStatus, orderItemId, productId } = req.body;

    try {
        // Validate input
        if (!orderStatus || !orderItemId || !productId) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: orderStatus, orderItemId, or productId",
            });
        }

        // Prepare update object
        const updateData = { 'orderedProducts.$.orderStatus': orderStatus };
        if (orderStatus === 'delivered') {
            updateData['orderedProducts.$.paymentStatus'] = 'paid';
            updateData[paymentStatus] = 'paid';
        } else if (orderStatus === 'cancelled') {
            updateData['orderedProducts.$.paymentStatus'] = 'failed';
            updateData[paymentStatus] = 'failed';
        }

        // Find and update the order
        const order = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            { $set: updateData },
            { new: true }
        );

        // Handles case where the order was not found
        if (!order) {
            return res.status(404).json({
                success: false,
                error: "Order item not found",
            });
        }

        const allProductsDeliveredAndPaid = order.orderedProducts.every(product => {
            return (product.orderStatus === 'delivered' && product.paymentStatus === 'paid') || product.orderStatus === 'cancelled';
        });

        // If all products are delivered, update allOrdersStatus
        if (allProductsDeliveredAndPaid) {
            await Order.findOneAndUpdate(
                { _id: order._id },
                { $set: { allOrdersStatus: 'delivered' } },
                { new: true }
            );
        }

        // Responds with success
        res.json({ success: true });

    } catch (err) {
        console.error(`Error caught in changeStatus admin OrderController: ${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


const returnStatus = async (req, res) => {
    const { orderItemId, productId, process } = req.body;

    let updateData = { 'orderedProducts.$.returnStatus': 'approved' };

    try {

        if (!orderItemId, !productId) throw new Error("orderItemId or productId not found");

        // Prepare update object
        if (!process) {
            updateData = { 'orderedProducts.$.returnStatus': 'rejected' };
        }

        const orderRequest = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            { $set: updateData },
            { new: true }
        );

        if (!orderRequest) return res.status(400).json({
            success: false,
            message: 'Error while rejecting the return'
        });

        res.json({ success: true });

    } catch (err) {
        console.error(`Error caught in returnStatus admin OrderController ${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


const refund = async (req, res) => {
    const { productId, orderItemId } = req.body;
    try {

        // Validate input
        if (!orderItemId || !productId) {
            return res.status(400).json({ success: false, message: "orderItemId and productId are required" });
        }

        // Update the order's return and payment status
        const order = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            {
                $set: {
                    'orderedProducts.$.returnStatus': 'refunded',
                    'orderedProducts.$.paymentStatus': 'refunded',
                    'orderedProducts.$.orderStatus': 'returned'
                }
            },
            { new: true }
        ).populate('coupon');

        // Check if all ordered products are marked as returned
        const allReturned = order.orderedProducts.every(item => item.paymentStatus === 'refunded');

        // If all items are returned, update the order status
        if (allReturned && order.allOrdersStatus !== 'returned') {
            await Order.findOneAndUpdate(
                { _id: order._id },
                { $set: { allOrdersStatus: 'returned' } }
            );
        }

        if (!order) {
            return res.status(400).json({ success: false, message: 'Error while processing the refund' });
        }

        // Calculate total amount to refund
        let totalAmount = order.orderedProducts.reduce((acc, product) => acc + product.totalPay, 0);
        if (order.coupon) {
            totalAmount += order.coupon.couponValue;
        }

        const transactionDetails = {
            orderId: order._id,
            amount: totalAmount,
            type: 'credit',
            refunded: true
        }


        // Update user wallet balance
        const updatedWallet = await Wallet.findOneAndUpdate(
            { user: order.user },
            {
                $push: { transactions: transactionDetails },
                $inc: { balance: totalAmount }
            },
            { new: true }
        );

        if (!updatedWallet) {
            return res.status(404).json({ success: false, message: 'User wallet not found' });
        }
        console.log(updatedWallet)

        res.json({ success: true, message: 'Refund processed successfully' });

    } catch (err) {
        console.error(`Error caught in refund admin OrderController ${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


module.exports = {
    renderOrderView,
    renderOrderList,
    returnStatus,
    changeStatus,
    refund
}
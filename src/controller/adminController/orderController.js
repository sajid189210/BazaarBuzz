const response = require('../../Services/responseMapper');
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
                return response.error(res, "Invalid ObjectId format", 400);
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
        response.serverError(res, err);
    }
};

const renderOrderView = async (req, res) => {
    const { orderId } = req.query;

    if (!req.session.admin) return res.redirect('/admin/signIn');
    try {
        const order = await Order.findById(orderId).populate('orderedProducts.product').populate('coupon');

        res.render('admin/adminOrderView', { order });

    } catch (err) {
        response.serverError(res, err);
    }
}

const changeStatus = async (req, res) => {
    const { orderStatus, orderItemId, productId, paymentStatus } = req.body;

    try {
        // Validate input
        if (!orderStatus || !orderItemId || !productId) {
            return response.error(res, "Missing required fields: orderStatus, orderItemId, or productId", 400);
        }

        // Prepare update object
        const updateData = { 'orderedProducts.$.orderStatus': orderStatus };
        if (orderStatus === 'delivered') {
            updateData['orderedProducts.$.paymentStatus'] = 'paid';
        } else if (orderStatus === 'cancelled') {
            updateData['orderedProducts.$.paymentStatus'] = 'refunded';
        }

        // Find and update the order
        const order = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            { $set: updateData },
            { new: true }
        );

        // Handles case where the order was not found
        if (!order) {
            return response.error(res, "Order item not found", 404);
        }

        const allProductsDeliveredAndPaid = order.orderedProducts.every(product => {
            return (product.orderStatus === 'delivered' && product.paymentStatus === 'paid');
        });

        const allProductsCancelledAndReturned = order.orderedProducts.every(product => {
            return (product.orderStatus === 'cancelled' && product.paymentStatus === 'refunded');
        });


        // If all products are delivered, update allOrdersStatus
        if (allProductsDeliveredAndPaid) {
            await Order.findOneAndUpdate(
                { _id: order._id },
                { $set: { allOrdersStatus: 'delivered', paymentStatus: 'paid' } },
                { new: true }
            );
        }

        // If all products are cancelled, update allOrdersStatus
        if (allProductsCancelledAndReturned) {
            await Order.findOneAndUpdate(
                { _id: order._id },
                { $set: { allOrdersStatus: 'cancelled', paymentStatus: 'refunded' } },
                { new: true }
            );
        }

        // Responds with success
        res.json({ success: true });

    } catch (err) {
        response.serverError(res, err);
    }
};


const returnStatus = async (req, res) => {
    const { orderItemId, productId, process } = req.body;

    let updateData = { 'orderedProducts.$.returnStatus': 'approved' };

    try {

        if (!orderItemId || !productId) throw new Error("orderItemId or productId not found");

        // Prepare update object
        if (!process) {
            updateData = { 'orderedProducts.$.returnStatus': 'rejected' };
        }

        const orderRequest = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            { $set: updateData },
            { new: true }
        );

        if (!orderRequest) return response.error(res, "Error while rejecting the return", 400);

        res.json({ success: true });

    } catch (err) {
        response.serverError(res, err);
    }
};


const refund = async (req, res) => {
    const { productId, orderItemId } = req.body;
    try {

        // Validate input
        if (!orderItemId || !productId) {
            return response.error(res, "orderItemId and productId are required", 400);
        }

        // Update the order's return and payment status
        const order = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            {
                $set: {
                    'orderedProducts.$.returnStatus': 'refunded',
                    'orderedProducts.$.paymentStatus': 'refunded',
                    'orderedProducts.$.orderStatus': 'returned',
                }
            },
            { new: true }
        ).populate('coupon');

        // Check if all ordered products are marked as returned
        const allReturned = order.orderedProducts.every(item => item.paymentStatus === 'refunded');

        // If all items are returned, update the order status
        if (allReturned) {
            await Order.findOneAndUpdate(
                { _id: order._id },
                {
                    $set:
                    {
                        allOrdersStatus: 'returned',
                        paymentStatus: 'refunded'
                    }
                }
            );
        }

        if (!order) {
            return response.error(res, "Error while processing the refund", 400);
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
            return response.error(res, "User wallet not found", 404);
        }

        res.json({ success: true, message: 'Refund processed successfully' });

    } catch (err) {
        response.serverError(res, err);
    }
};


module.exports = {
    renderOrderView,
    renderOrderList,
    returnStatus,
    changeStatus,
    refund
}
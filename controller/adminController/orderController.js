const { findOneAndUpdate } = require('../../model/categoryModel');
const Order = require('../../model/orderModel');


const renderOrderList = async (req, res) => {
    let returnedProducts;

    if (!req.session.admin) return res.redirect('/admin/signIn');
    try {
        const orders = await Order.find({}).populate('user').populate('orderedProducts.product').sort({ createdAt: -1 });

        orders.forEach(order => {
            returnedProducts = order.orderedProducts.filter(item => item.returnStatus && item.returnStatus === 'requested');
        });

        res.render('admin/adminOrderList', { orders, returnedProducts });

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
        const order = await Order.findById(orderId).populate('orderedProducts.product');

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
        } else if (orderStatus === 'cancelled') {
            updateData['orderedProducts.$.paymentStatus'] = 'failed';
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

        if (!orderItemId, !productId) throw new Error("orderItemId or productId not found");

        const orderRequest = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            { $set: { 'orderedProducts.$.returnStatus': 'refunded', 'orderedProducts.$.paymentStatus': 'refunded' } },
            { new: true }
        );

        if (!orderRequest) return res.status(400).json({
            success: false,
            message: 'Error while rejecting the return'
        });

        res.json({ success: true });

    } catch (err) {
        console.error(`Error caught in refund admin OrderController ${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
}


module.exports = {
    renderOrderView,
    renderOrderList,
    returnStatus,
    changeStatus,
    refund
}
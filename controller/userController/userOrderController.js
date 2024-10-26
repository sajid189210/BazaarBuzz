const Category = require('../../model/categoryModel');
const Order = require('../../model/orderModel');

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
}


module.exports = {
    returnProduct,
    getOrders,
}
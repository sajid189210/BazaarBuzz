const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Cart = require('../../model/userCartModel');
const User = require('../../model/userModel');
const Order = require('../../model/orderModel')


const getCheckout = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;

        const user = await User.findById(userId);

        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        res.render('user/userCheckout', {
            cart,
            user
        });

    } catch (err) {
        console.error(`Error caught getCheckout in the checkoutController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const getOrderSummary = async (req, res) => {
    const userId = req.session.user.userId || '';
    try {

        if (!userId) return res.redirect('user/homepage');

        const orders = await Order.find({ user: userId }).populate('orderedProducts.product').sort({ createdAt: -1 });

        const category = await Category.find({ isActive: true });

        if (!orders) throw new Error("Couldn't find the order summary.");

        res.render('user/userOrderSummary', {
            order: orders[0],
            user: req.session.user || null,
            category
        });

    } catch (err) {
        console.error(`Error caught getOrderSummary in the checkoutController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }


}

const proceedToPayment = async (req, res) => {
    const { address, paymentMethod } = req.body;
    const userId = req.session.user.userId || '';
    let paymentStatus = 'pending';

    try {

        if (!address || !paymentMethod) throw new Error("address or payment method not found.");

        if (!userId) return res.redirect('/user/signIn');

        const user = await User.findById(userId);

        if (!user) throw new Error("User not found");

        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart) throw new Error("Cart not found");

        if (paymentMethod === 'razorpay' || paymentMethod === 'wallet') {
            paymentStatus = 'paid';
        }

        const orderDetails = {
            user: user._id,
            orderedProducts: [],
            paymentMethod,
            shippingAddress: address,
        };

        // pushes details in the orderedProducts array from the cart.
        cart.items.forEach(item => {
            let details = {
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.productPrice,
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
                discountedPrice: item.discountedPrice,
                totalPay: item.discountedPrice * item.quantity,
                paymentStatus,
            }

            orderDetails.orderedProducts.push(details);
        });

        // saves the order in the db.
        try {
            const order = new Order(orderDetails);
            await order.save();
        } catch (err) {
            throw new Error("Error caught while saving the order in the db", err);
        }

        // Clear items from the cart.
        await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } }
        );
        res.status(201).json({ success: true, })

    } catch (err) {
        console.error(`Error caught proceedToPayment in the checkoutController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }

}

module.exports = {
    proceedToPayment,
    getOrderSummary,
    getCheckout,
}
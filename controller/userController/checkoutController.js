const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Coupon = require('../../model/couponModel');
const Wallet = require("../../model/walletModel");
const Order = require('../../model/orderModel');
const Cart = require('../../model/userCartModel');
const User = require('../../model/userModel');

const crypto = require('crypto');
require('dotenv').config();

//* Razorpay configuration.
const razorPayInstance = require('../../Services/razorPay');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;


const getCheckout = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;

        const user = await User.findById(userId);
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        const wallet = await Wallet.findOne({ user: userId })

        await Cart.updateOne({ user: userId }, { $set: { discountedValue: 0, coupon: null } })

        if (cart.items.length === 0) return res.redirect('/user/homepage');

        res.render('user/userCheckout', {
            cart,
            user,
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

        if (!userId) return res.redirect('/user/homepage');

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

        // Validate input
        if (!address || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Address and payment method are required." });
        }

        if (!userId) {
            return res.redirect('/user/signIn');
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product').populate('coupon');
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found." });
        }

        // Determine payment status based on payment method
        if (paymentMethod === 'razorpay' || paymentMethod === 'wallet') {
            paymentStatus = 'paid';
        }

        const orderDetails = {
            user: user._id,
            orderedProducts: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.productPrice,
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
                discountedPrice: item.discountedPrice,
                totalPay: item.discountedPrice * item.quantity,
                paymentStatus,
            })),
            paymentMethod,
            shippingAddress: address,
            coupon: cart.coupon || null,
        };

        // Save the order to the database
        const order = new Order(orderDetails);
        await order.save();

        //* Update user usedCoupons
        if (cart.coupon) {
            const couponIndex = user.usedCoupons.findIndex(coupon => coupon.couponCode === cart.coupon.couponCode);
            if (couponIndex !== -1) {
                user.usedCoupons[couponIndex].count += 1; // Increment existing coupon count
            } else {
                user.usedCoupons.push({
                    couponCode: cart.coupon.couponCode,
                    couponValue: cart.coupon.couponValue,
                    count: 1
                });
            }
            await User.findByIdAndUpdate(userId, { usedCoupons: user.usedCoupons }, { new: true });
        }

        // Calculate total amount
        const totalAmount = cart.coupon ? cart.discountedValue : orderDetails.orderedProducts.reduce((acc, item) => acc + item.totalPay, 0);


        //* payment conditions - razorpay, wallet and cod.
        if (paymentMethod === 'razorpay') {
            try {
                const options = {
                    amount: totalAmount * 100, //? total amount to be charged to the customer.
                    currency: 'INR', //? The currency for the transaction
                    receipt: `receipt_${new Date().getTime()}`, //? A unique identifier for the transaction
                    payment_capture: 1, //? Set to 1 to automatically capture the payment (default is 0)
                };

                razorPayInstance.orders.create(options, async (err, order) => {
                    if (err) {
                        console.error(err);
                        return res.status(400).json({ success: false, message: `Something went wrong! ${err}` });
                    }

                    return res.status(200).json({
                        success: true,
                        razorpayOrderId: order.orderId,
                        amount: order.amount,
                        currency: order.currency,
                        orderId: order.id,
                        orderType: paymentMethod,
                        address,
                        totalAmount,
                        user,
                        RAZORPAY_KEY_ID,
                    });
                });
            } catch (err) {
                console.error(`Error creating Razorpay order: ${err.message}`);
                return res.status(500).json({
                    success: false,
                    message: "Payment processing failed. Please try again.",
                    details: err.message
                });
            }

        } else if (paymentMethod === 'wallet') {

            try {
                // Fetch the user's wallet information
                const wallet = await Wallet.findOne({ user: userId });

                if (!wallet) {
                    return res.status(404).json({ success: false, message: "Wallet not found." });
                }

                // Check if the total amount is within the wallet balance
                if (totalAmount > wallet.balance) {
                    return res.status(400).json({ success: false, message: "Insufficient wallet balance." });
                }

                // Proceed with the payment logic
                wallet.balance -= totalAmount; // Deduct the amount from the wallet
                wallet.transactions.push({
                    orderId: order._id,
                    amount: totalAmount,
                    type: 'debit',
                    date: new Date(),
                });
                console.log(wallet)
                // Save the updated wallet
                await wallet.save();

                // clears the cart.
                await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

                // Respond with success
                return res.status(200).json({ success: true, message: 'Payment successful via wallet.', balance: wallet.balance, orderType: paymentMethod });
            } catch (err) {
                console.error(`Error processing wallet payment: ${err.message}`);

                // Handle specific error
                if (err.name === 'ValidationError') {
                    return res.status(400).json({ success: false, message: "Invalid wallet transaction." });
                }

                // General error response
                return res.status(500).json({
                    success: false,
                    error: "Internal server error",
                    message: "Payment processing failed. Please try again.",
                    details: err.message,
                });
            }

        } else {
            await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
            return res.status(201).json({ success: true, orderType: paymentMethod });
        }

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

const applyCoupon = async (req, res) => {
    try {
        // Validate input
        if (!req.session.user || !req.body.cartId || !req.body.inputValue) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input'
            });
        }

        const { cartId } = req.body;
        const inputValue = req.body.inputValue;

        // Find coupon, cart, user.
        const coupon = await Coupon.findOne({ couponCode: inputValue });
        const user = await User.findById(req.session.user.userId);
        const cart = await Cart.findById(cartId).populate('coupon');

        if (!coupon || !user || !cart) {
            return res.status(400).json({
                success: false,
                message: 'Coupon, user or cart was not found'
            });
        }

        // Calculate total price
        const totalPrice = cart.items.reduce((acc, item) => acc + item.discountedPrice, 0);


        const now = new Date();
        const expiryDate = new Date(coupon.expiry);

        if (totalPrice < coupon.minAmount) {
            return res.status(400).json({
                success: false,
                message: `Total price must be above ${coupon.minAmount} to apply that coupon`
            });
        }

        if (now > expiryDate) {
            return res.status(400).json({
                toast: "false",
                message: `Coupon has expired`
            });
        }

        // checking the coupon use count.
        const index = user.usedCoupons.findIndex(couponItem => couponItem.couponCode === coupon.couponCode);
        if (index != -1 && user.usedCoupons[index].count >= coupon.count) {
            return res.status(400).json({
                toast: "false",
                message: `You have exceeded the maximum use counts.`
            });
        }

        //* Applying the Coupon.
        let couponAppliedPrice;
        if (coupon.couponType === 'price') {
            couponAppliedPrice = totalPrice - coupon.couponValue;
        } else if (coupon.couponType === 'percentage') {
            couponAppliedPrice = totalPrice - (totalPrice * (coupon.couponValue / 100));
        }

        // re-validating the min-amount;
        if (couponAppliedPrice < coupon.minValue) {
            return res.status(400).json({
                success: false,
                message: `Total price must be above ${coupon.minAmount}`
            });
        }

        await Cart.findByIdAndUpdate(
            cartId,
            { $set: { discountedValue: couponAppliedPrice, coupon: coupon._id } }
        );

        // Return successful response with applied price
        res.status(200).json({
            success: true,
            message: 'Coupon applied successfully',
            appliedPrice: couponAppliedPrice,
        });

    } catch (err) {
        console.error(`Error caught applyCoupon in the checkoutController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const verifyPayment = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');
    const userId = req.session.user.userId;
    const { razorpayPaymentId, razorpayOrderId, signature } = req.body;

    try {
        // Generate the HMAC SHA256 signature
        const generatedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        // Verify the signature
        const isVerified = generatedSignature === signature;

        if (isVerified) {
            // clears the cart.
            await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
            return res.json({ success: true, message: 'Payment verified successfully' });
        } else {
            return res.json({ success: false, message: 'Payment verification failed' });
        }

    } catch (err) {
        console.error(`Error caught verifyPayment in the checkoutController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

module.exports = {
    proceedToPayment,
    getOrderSummary,
    verifyPayment,
    getCheckout,
    applyCoupon,
}
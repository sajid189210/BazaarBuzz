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


//? Function to handle stocks quantity.
const handleStock = async (order, paymentMethod) => {
    const orderedProductDetails = order.orderedProducts.filter(item => item.product);

    orderedProductDetails.forEach(async (orderedProduct) => {
        const product = await Product.findById(orderedProduct.product);

        const updatedProduct = await Product.updateOne(
            { _id: orderedProduct.product.toString(), 'variants.size': orderedProduct.selectedSize },
            { $inc: { 'variants.$.stock': -(1 * orderedProduct.quantity) } },
            { new: true }
        );

        if (updatedProduct.modifiedCount == 0) {
            throw new Error(`Error caught while handling stock after product purchase on ${paymentMethod}.`);
        }
    });
};



const getCheckout = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;

        const user = await User.findById(userId);
        const cart = await Cart.findOne({ user: userId }).populate('items.product').populate('items.offer');
        const wallet = await Wallet.findOne({ user: userId })

        // Total amount of the original price.
        const totalPrice = cart.items.reduce((acc, item) => acc + (item.product.productPrice * item.quantity), 0);
        // Total discount applied from the product offer.
        const totalProductDiscountedValue = cart.items.reduce((acc, item) => acc + (((item.product.productPrice * item.product.discount) / 100) * item.quantity), 0);
        // Total discount applied from the brand offer.
        const brandDiscount = cart.items.reduce((acc, item) => {
            if (item.offer && item.offer.isActive) {
                return acc + (item.product.productPrice * ((100 - item.product.discount) / 100) * (item.offer.discount / 100));
            }
            return acc;
        }, 0);
        // Final amount price.
        const total = cart.items.reduce((acc, item) => acc + item.discountedPrice, 0)

        await Cart.updateOne({ user: userId }, { $set: { discountedValue: 0, coupon: null } });

        if (cart.items.length === 0) return res.redirect('/user/homepage');

        res.render('user/userCheckout', {
            totalProductDiscountedValue,
            brandDiscount,
            totalPrice,
            total,
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
    if (!req.session.user) return res.redirect('/user/signIn');
    const orderId = req.params.id;
    try {
        const order = await Order.findById(orderId).populate('orderedProducts.product');
        const category = await Category.find({ isActive: true });
        if (!order) throw new Error("Couldn't find the order summary.");

        const totalPay = order.orderedProducts.reduce((acc, item) => acc + item.totalPay, 0);
        const originalTotalPrice = order.orderedProducts.reduce((acc, item) => acc + (item.product.productPrice * item.quantity), 0);
        const totalDiscountApplied = originalTotalPrice - totalPay - order.shippingFee;

        res.render('user/userOrderSummary', {
            order,
            totalPay,
            originalTotalPrice,
            totalDiscountApplied,
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
    if (!req.session.user) return res.redirect('/user/signIn');
    const userId = req.session.user.userId || '';
    const { address, paymentMethod } = req.body;
    let paymentStatus = 'pending';

    try {
        // Validate input
        if (!address || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Address and payment method are required." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product').populate('coupon').populate('items.offer');
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
                totalPay: parseInt(item.discountedPrice),
                paymentStatus,
            })),
            paymentMethod,
            shippingAddress: address,
            coupon: cart.coupon || null,
        };

        const newOrder = new Order(orderDetails);

        //* Update user's usedCoupons if used.
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
        let totalAmount = cart.coupon ? cart.discountedValue : orderDetails.orderedProducts.reduce((acc, item) => acc + item.totalPay, 0);

        //* payment conditions - razorpay, wallet and cod.
        if (paymentMethod === 'razorpay') {
            try {
                const options = {
                    amount: Math.round(totalAmount * 100), //? total amount to be charged to the customer. Must be an Integer
                    currency: 'INR', //? The currency for the transaction
                    receipt: `receipt_${new Date().getTime()}`, //? A unique identifier for the transaction
                    payment_capture: 1, //? Set to 1 to automatically capture the payment (default is 0)
                };

                razorPayInstance.orders.create(options, async (err, order) => { //?this order is razorpay's order.
                    if (err) {
                        console.error(err);
                        return res.status(400).json({ success: false, message: `Something went wrong! ${err}` });
                    }

                    // Save the order to the database
                    await newOrder.save();

                    // reduce the  stock.
                    handleStock(newOrder, paymentMethod);

                    return res.status(200).json({
                        success: true,
                        razorpayOrderId: order.orderId,
                        amount: order.amount,
                        currency: order.currency,
                        orderId: order.id,
                        orderType: paymentMethod,
                        newOrderId: newOrder._id,
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

                // Save the updated wallet
                await wallet.save();

                // Save the order to the database
                await newOrder.save();

                // reduce the  stock.
                handleStock(newOrder, paymentMethod);

                // clears the cart.
                await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

                // Respond with success
                return res.status(200).json({
                    success: true,
                    message: 'Payment successful via wallet.',
                    balance: wallet.balance,
                    orderType: paymentMethod,
                    newOrderId: newOrder._id
                });

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
            // Save the order to the database
            await newOrder.save();

            // reduce the  stock.
            handleStock(newOrder, paymentMethod);

            // clears the cart.
            await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });

            return res.status(201).json({ success: true, orderType: paymentMethod, newOrderId: newOrder._id });
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
        const cart = await Cart.findById(cartId).populate('coupon').populate('items.offer');

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
        if (couponAppliedPrice < coupon.minAmount) {
            return res.status(400).json({
                toast: false,
                message: `Coupon is not applicable for this amount.`
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
            couponValue: coupon.couponValue,
            totalPrice,
        });

    } catch (err) {
        console.error(`Error caught applyCoupon in the checkoutController: ${err}`);
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
            if (req.query.orderId) {
                const { orderId } = req.query;
                await Order.findByIdAndUpdate(
                    orderId,
                    {
                        $set: {
                            paymentStatus: 'paid',
                            'orderedProducts.$[].paymentStatus': 'paid'
                        }
                    },
                );
            }
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

const handlePaymentFailure = async (req, res) => {
    try {
        const { newOrderId } = req.body;
        const order = await Order.findByIdAndUpdate(
            newOrderId,
            {
                $set: {
                    paymentStatus: 'failed',
                    'orderedProducts.$[].paymentStatus': 'failed'
                }
            },
            { new: true, }
        );

        if (!order) {
            return res.status(400).json({ success: false, message: 'Order could not be found.' });
        }

        res.status(200).json({ success: true });

    } catch (err) {
        console.error(`Error caught handlePaymentFailure in the checkoutController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

module.exports = {
    handlePaymentFailure,
    proceedToPayment,
    getOrderSummary,
    verifyPayment,
    getCheckout,
    applyCoupon,
}
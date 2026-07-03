const response = require('../../Services/responseMapper');
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


//? Helper function to handle stock quantity.
const handleStock = async (order, paymentMethod) => {
    const orderedProductDetails = order.orderedProducts.filter(item => item.product);

    orderedProductDetails.forEach(async (orderedProduct) => {
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

//? Helper function to clear cart.
const clearCart = async (userId) => {
    await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
};


const getCheckout = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;

        const [user, cart, wallet] = await Promise.all([
            User.findById(userId),
            Cart.findOne({ user: userId }).populate('items.product').populate('items.offer'),
            Wallet.findOne({ user: userId }),
        ]);

        if (!user, !cart, !wallet) {
            return response.error(res, 'Failed to load checkout', 400);
        }

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
        const total = cart.items.reduce((acc, item) => acc + item.discountedPrice, 0);
        const tax = Math.round((total * 5) / 100);

        await Cart.updateOne({ user: userId }, { $set: { discountedValue: 0, coupon: null } });

        res.render('user/userCheckout', {
            totalProductDiscountedValue,
            brandDiscount,
            totalPrice,
            searchBox: false,
            total,
            cart,
            user,
            tax,
        });

    } catch (err) {
        response.serverError(res, err);
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
            category,
            searchBox: false
        });

    } catch (err) {
        response.serverError(res, err);
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
            return response.error(res, "Address and payment method are required.", 400);
        }

        const user = await User.findById(userId);
        if (!user) {
            return response.error(res, "User not found.", 404);
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product').populate('coupon').populate('items.offer');
        if (!cart) {
            return response.error(res, "Cart not found.", 404);
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
                totalPay: parseInt(item.discountedPrice + Math.round((item.discountedPrice * 5) / 100)),
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
                        return response.error(res, `Something went wrong! ${err}`, 400);
                    }

                    // Save the order to the database
                    await newOrder.save();

                    // reduce the  stock.
                    await handleStock(newOrder, paymentMethod);

                    return response.success(res, {
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
                response.serverError(res, err);
            }

        } else if (paymentMethod === 'wallet') {

            try {
                // Fetch the user's wallet information
                const wallet = await Wallet.findOne({ user: userId });

                if (!wallet) {
                    return response.error(res, "Wallet not found.", 404);
                }

                // Check if the total amount is within the wallet balance
                if (totalAmount > wallet.balance) {
                    return response.error(res, "Insufficient wallet balance.", 400);
                }

                // Proceed with the payment logic
                wallet.balance -= totalAmount; // Deduct the amount from the wallet
                wallet.transactions.push({
                    orderId: newOrder._id,
                    amount: totalAmount,
                    type: 'debit',
                    date: new Date(),
                });

                // Save the updated wallet
                await wallet.save();

                // Save the order to the database
                await newOrder.save();

                // reduce the  stock.
                await handleStock(newOrder, paymentMethod);

                // clears the cart.
                clearCart(userId);

                // Respond with success
                return response.success(res, {
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
                    return response.error(res, "Invalid wallet transaction.", 400);
                }

                // General error response
                response.serverError(res, err);
            }

        } else {
            // Save the order to the database
            await newOrder.save();

            // reduce the  stock.
            await handleStock(newOrder, paymentMethod);

            // clears the cart.
            clearCart(userId);

            return response.success(res, { success: true, orderType: paymentMethod, newOrderId: newOrder._id });
        }

    } catch (err) {
        response.serverError(res, err);
    }
};

const applyCoupon = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');

    const { cartId, inputValue } = req.body;
    const userId = req.session.user.userId;

    if (!cartId || !inputValue) {
        return response.error(res, "Invalid input", 400);
    }

    try {
        const [coupon, user, cart] = await Promise.all([
            Coupon.findOne({ couponCode: inputValue }),
            User.findById(req.session.user.userId),
            Cart.findById(cartId).populate('coupon').populate('items.offer')
        ]);

        if (!coupon || !user || !cart) {
            return response.error(res, "Failed to apply coupon.", 400);
        }

        // Calculate total price
        const totalPrice = cart.items.reduce((acc, item) => acc + item.discountedPrice, 0);
        console.log(totalPrice)

        if (totalPrice < coupon.minAmount) {
            return response.error(res, `Total price must be above ${coupon.minAmount} to apply that coupon`, 400);
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiryDate = new Date(coupon.expiry);
        expiryDate.setHours(0, 0, 0, 0);

        if (now > expiryDate) {
            return response.error(res, "Coupon has expired", 400, { toast: false });
        }

        // checking the coupon use count.
        const index = user.usedCoupons.findIndex(couponItem => couponItem.couponCode.toUpperCase() === coupon.couponCode.toUpperCase());
        if (index != -1 && user.usedCoupons[index].count > coupon.count) {
            return response.error(res, "You have exceeded the maximum use counts.", 400, { toast: false });
        }

        //* Applying the Coupon.
        let couponAppliedPrice;
        if (coupon.couponType === 'price') {
            couponAppliedPrice = totalPrice - coupon.couponValue;
        } else if (coupon.couponType === 'percentage') {
            couponAppliedPrice = totalPrice - (totalPrice * (coupon.couponValue / 100));
        }

        // re-validating the min-amount;
        if (couponAppliedPrice < coupon.minAmount || couponAppliedPrice < 0) {
            couponAppliedPrice = coupon.minAmount;
        }

        await Cart.findByIdAndUpdate(
            cartId,
            { $set: { discountedValue: couponAppliedPrice, coupon: coupon._id } }
        );

        // Return successful response with applied price
        response.success(res, {
            success: true,
            message: 'Coupon applied successfully',
            appliedPrice: couponAppliedPrice,
            couponValue: coupon.couponValue,
            totalPrice,
        });

    } catch (err) {
        response.serverError(res, err);
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
            clearCart(userId);

            return res.json({ success: true, message: 'Payment verified successfully' });
        } else {
            return res.json({ success: false, message: 'Payment verification failed' });
        }

    } catch (err) {
        response.serverError(res, err);
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
                    'orderedProducts.$[].paymentStatus': 'failed',
                    'orderedProducts.$[].orderStatus': 'pending'
                }
            },
            { new: true, }
        );

        if (!order) {
            return response.error(res, "Order could not be found.", 400);
        }

        response.success(res, { success: true });

    } catch (err) {
        response.serverError(res, err);
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
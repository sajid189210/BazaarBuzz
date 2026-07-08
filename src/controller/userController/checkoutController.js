const razorPayInstance = require('../../Services/razorPay');
const response = require('../../Services/responseMapper');
const { Types } = require('mongoose');
const crypto = require('crypto');

const Product = require('../../model/productModel');
const Coupon = require('../../model/couponModel');
const Wallet = require("../../model/walletModel");
const Order = require('../../model/orderModel');
const Cart = require('../../model/userCartModel');
const User = require('../../model/userModel');
const Category = require('../../model/categoryModel');

require('dotenv').config();

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

//? Helper function to handle stock quantity.
const handleStock = async (order, increment) => {
    const result = await Promise.all(
        order.items.map((item) => {
            const quantity = increment ? item.quantity : -item.quantity;

            return Product.findOneAndUpdate(
                {
                    _id: item.productId,
                    variants: {
                        $elemMatch: {
                            size: item.selectedSize,
                            color: item.selectedColor,
                        },
                    },
                },
                {
                    $inc: {
                        "variants.$.stock": quantity,
                    },
                },
                { new: true, runValidators: true }
            )
        })
    );
    return result.every(product => product !== null);
};

//? Helper function to clear cart.
const clearCart = async (userId) => {
    await Cart.findOneAndUpdate(
        { user: userId },
        {
            $set: {
                items: [],
                discountedValue: 0,
                coupon: null
            }
        });
};

const round = (value) => {
    return Math.trunc(value * 100) / 100;
}

// ------------------------------------------------------------

const getCheckout = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');

    const userId = req.session.user.userId;

    try {
        const [user, cart, wallet, categories] = await Promise.all([
            User.findById(userId),
            Cart.findOne({ user: userId })
                .populate('items.product')
                .populate('items.offer')
                .populate('coupon'),
            Wallet.findOne({ user: userId }),
            Category.find({ isActive: { $ne: false } }),
        ]);

        if (!user || !cart) {
            return response.error(res, 'Failed to load checkout', 400);
        }

        if (!cart.items?.length) {
            req.flash("error", "Your cart is empty. Add some items before proceeding to checkout.");
            return res.redirect("/user/cart");
        }

        let subTotal = 0;
        let total = 0;

        for (const item of cart.items) {
            subTotal += item.product.productPrice * item.quantity;
            total += item.discountedPrice * item.quantity;
        }

        let totalDiscount = subTotal - total;
        const taxAmount = total * .05;
        total += taxAmount;
        let hasCouponApplied = false;

        if (cart.discountedValue > 0) {
            totalDiscount += cart.discountedValue;
            hasCouponApplied = true;
            total -= cart.discountedValue;
        }

        res.render('user/userCheckout', {
            title: 'Checkout',
            totalDiscount: round(totalDiscount),
            subTotal: round(subTotal),
            searchBox: false,
            total: round(total),
            cart,
            user,
            wallet,
            categories,
            taxAmount: round(taxAmount),
            hasCouponApplied,
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

const getOrderSummary = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');
    const orderId = req.params.id;

    try {
        const order = await Order.findById(orderId);
        if (!order) throw new Error("Couldn't find the order summary.");

        const categories = await Category.find({ isActive: { $ne: false } });
        res.render('user/userOrderSummary', {
            title: 'Order Summary',
            order,
            user: req.session.user || null,
            searchBox: false,
            categories,
        });

    } catch (err) {
        response.serverError(res, err);
    }
}

const proceedToPayment = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');

    const userId = req.session.user.userId || '';
    const { address, paymentMethod } = req.body;

    if (!address || !paymentMethod) {
        return response.error(res, "Address and payment method are required.", 400);
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return response.error(res, "User not found.", 404);
        }

        const cart = await Cart.findOne({ user: userId })
            .populate('items.product')
            .populate('coupon')
            .populate('items.offer');

        if (!cart.items?.length) {
            req.flash("error", "Your cart is empty. Add some items before proceeding to checkout.");
            return res.redirect("/user/cart");
        }

        //* Update user's usedCoupons if used.
        if (cart?.coupon) {
            const usedCouponData = user.usedCoupons.find(c => c.couponId.toString() === cart.coupon._id.toString());

            if (usedCouponData) {
                usedCouponData.count++;
            } else {
                user.usedCoupons.push({
                    couponId: cart.coupon._id,
                    couponCode: cart.coupon.couponCode,
                    couponValue: cart.coupon.couponValue,
                    count: 1
                });
            }
        }

        const subtotal = cart.items.reduce((acc, item) => acc + (item.product.productPrice * item.quantity), 0);

        let total = cart.items.reduce((acc, item) => acc + (item.discountedPrice * item.quantity), 0);

        const productDiscount = subtotal - total;

        const tax = total * 0.05;

        total += tax;

        if (cart.discountedValue > 0) {
            total -= cart.discountedValue;
        }

        const orderDetails = {
            user: user._id,
            items: cart.items.map(item => ({
                productId: item.product._id,
                name: item.product.productName,
                image: item.product.images[0],
                brand: item.product.brand,
                category: item.product.category,
                quantity: item.quantity,
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
                unitPrice: item.product.productPrice,
                finalPrice: item.discountedPrice,
            })),
            shippingAddress: address,
            payment: {
                method: paymentMethod,
            },
            coupon: cart.coupon !== null ? {
                code: cart.coupon.couponCode,
                discount: cart.discountedValue
            } : null,
            subtotal,
            productDiscount,
            tax,
            total: round(total),
        };

        const newOrder = new Order(orderDetails);

        //* payment conditions - razorpay, wallet and cod.
        if (paymentMethod === 'razorpay') {
            try {
                const options = {
                    amount: Math.round(newOrder.total * 100), //? total amount to be charged to the customer. Must be an Integer
                    currency: 'INR', //? The currency for the transaction
                    receipt: `receipt_${new Date().getTime()}`, //? A unique identifier for the transaction
                    payment_capture: 1, //? Set to 1 to automatically capture the payment (default is 0)
                };

                const order = await razorPayInstance.orders.create(options);

                await newOrder.save();
                await user.save();
                await handleStock(newOrder, false);

                return response.success(res, {
                    razorpayOrderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    orderId: order.id,
                    orderType: paymentMethod,
                    newOrderId: newOrder._id,
                    address,
                    totalAmount: newOrder.total,
                    user,
                    RAZORPAY_KEY_ID,
                });

            } catch (err) {
                response.serverError(res, err);
            }

        } else if (paymentMethod === 'wallet') {

            try {
                // Fetch the user's wallet information
                let wallet = await Wallet.findOne({ user: userId });

                if (!wallet) {
                    wallet = new Wallet({
                        user: new Types.ObjectId(userId),
                        balance: 0
                    });
                }

                // Check if the total amount is within the wallet balance
                if (newOrder.total > wallet.balance) {
                    return response.error(res, "Insufficient wallet balance.", 400);
                }

                // Proceed with the payment logic
                wallet.balance -= newOrder.total; // Deduct the amount from the wallet
                wallet.transactions.push({
                    orderId: newOrder._id,
                    amount: newOrder.total,
                    type: 'debit',
                    date: new Date(),
                });

                // Save the order to the database
                newOrder.payment.status = 'paid';
                await newOrder.save();

                await user.save();

                // Save the updated wallet
                await wallet.save();

                // reduce the  stock.
                await handleStock(newOrder, false);

                // clears the cart.
                await clearCart(userId);

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
            await user.save();

            // reduce the  stock.
            await handleStock(newOrder, false);

            // clears the cart.
            await clearCart(userId);

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
            Coupon.findOne({ couponCode: inputValue.toUpperCase(), isActive: true }),
            User.findById(userId),
            Cart.findById(cartId).populate('coupon').populate('items.offer').populate('items.product')
        ]);

        if (!coupon || !user || !cart) {
            return response.error(res, "Failed to apply coupon.", 400);
        }

        if (!cart.items.length) {
            return response.error(res, "Your cart is empty.", 400);
        }

        if (cart.coupon) {
            return response.error(res, "A coupon is already applied.", 409);
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const expiryDate = new Date(coupon.expiry);
        expiryDate.setHours(0, 0, 0, 0);

        if (now > expiryDate) {
            return response.error(res, "Coupon has expired", 400, { toast: false });
        }

        const usedCouponData = user.usedCoupons.find(c => c.couponId.toString() === coupon._id.toString());

        if (usedCouponData && usedCouponData.count >= coupon.count) {
            return response.error(res, "Looks like this coupon has already been used!", 400);
        }

        let currentCartTotal = 0;
        for (const item of cart.items) {
            currentCartTotal += item.discountedPrice * item.quantity;
        }

        if (currentCartTotal < coupon.minAmount) {
            return response.error(res, `Almost there! Bump your cart up by ${coupon.minAmount} to claim your savings.`, 400);
        }

        let couponDiscountAmount = 0;
        const itemCouponBreakdown = [];

        for (let i = 0; i < cart.items.length; i++) {
            const item = cart.items[i];

            if (!item.product) {
                return response.error(res, "One or more products in your cart are no longer available.", 400);
            }

            const itemTotal = item.discountedPrice * item.quantity;

            let itemCouponShare = 0;

            if (coupon.couponType === "price") {

                // Give the last item whatever discount remains.
                if (i === cart.items.length - 1) {
                    itemCouponShare = coupon.couponValue - couponDiscountAmount;
                } else {
                    const itemWeight = itemTotal / currentCartTotal;
                    itemCouponShare = round(coupon.couponValue * itemWeight);
                }

            } else if (coupon.couponType === "percentage") {

                itemCouponShare = round(itemTotal * (coupon.couponValue / 100));

            } else {
                return response.error(res, "Invalid coupon.", 400);
            }

            const itemCouponPercentage = round(
                (itemCouponShare / itemTotal) * 100
            );

            itemCouponBreakdown.push({
                itemId: item._id,
                amount: itemCouponShare,
                percentage: itemCouponPercentage
            });

            const simulatedPrice = itemTotal - itemCouponShare;

            const absoluteMinFloor = round(item.product.productPrice * item.quantity * 0.10);

            if (simulatedPrice < absoluteMinFloor) {
                return response.error(res, `Coupon cannot be applied. It reduces ${item.product.productName} below its minimum allowed price floor.`, 400);
            }

            couponDiscountAmount += itemCouponShare;
        }

        cart.discountedValue = couponDiscountAmount;
        cart.coupon = coupon._id;
        await cart.save();

        // Return successful response with applied price
        return response.success(res, {
            success: true,
            message: 'Coupon applied successfully',
            appliedPrice: currentCartTotal - couponDiscountAmount,
            couponDiscount: couponDiscountAmount,
            itemCouponBreakdown
        });

    } catch (err) {
        console.log(err)
        return response.serverError(res, err);
    }
};

const verifyPayment = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');

    const userId = req.session.user.userId;
    const { razorpayPaymentId, razorpayOrderId, signature, orderId } = req.body;

    try {
        const generatedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        const isVerified = generatedSignature === signature;

        if (!isVerified) {
            return response.error(res, "Payment verification failed.", 400);
        }

        await Order.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    'payment.status': 'paid',
                    'payment.transactionId': razorpayPaymentId,
                    'payment.gatewayOrderId': razorpayOrderId,
                    'payment.paidAt': new Date()
                }
            },
            {
                runValidators: true
            }
        );

        await clearCart(userId);

        return response.success(res, {}, 'Payment verified successfully');
    } catch (err) {
        return response.serverError(res, err);
    }
};

const handlePaymentFailure = async (req, res) => {
    try {
        const { newOrderId } = req.body;
        const order = await Order.findByIdAndUpdate(
            newOrderId,
            {
                $set: {
                    'payment.status': 'failed',
                }
            },
            { new: true, runValidators: true }
        );

        if (!order) {
            return response.error(res, "Order could not be found.", 400);
        }

        await handleStock(order, true);

        return response.success(res, { success: true });

    } catch (err) {
        return response.serverError(res, err);
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
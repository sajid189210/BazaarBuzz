const { truncCurrency } = require('../../utils/currencyUtils');
const razorPayInstance = require('../../Services/razorPay');
const response = require('../../Services/responseMapper');
const MSG = require('../../constants/messages');
const crypto = require('crypto');

const Product = require('../../model/productModel');
const Coupon = require('../../model/couponModel');
const { WALLET_TYPE_USER, WALLET_TYPE_ADMIN } = require('../../constants/walletTypes');
const { PAYMENT_SOURCE_COD, PAYMENT_SOURCE_RAZORPAY, PAYMENT_SOURCE_WALLET } = require('../../constants/paymentSources');
const Wallet = require("../../model/walletModel");
const Order = require('../../model/orderModel');
const Cart = require('../../model/userCartModel');
const User = require('../../model/userModel');
const Category = require('../../model/categoryModel');

require('dotenv').config();

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

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
                            colors: item.selectedColor,
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
            Wallet.findOne({ owner: userId, type: WALLET_TYPE_USER })
                .then(w => w || new Wallet({ owner: userId, type: WALLET_TYPE_USER, balance: 0 })),
            Category.find({ isActive: { $ne: false } }),
        ]);

        if (!user || !cart) {
            return response.error(res, MSG.FAILED_LOAD_CHECKOUT, 400);
        }

        if (!cart.items?.length) {
            req.flash("error", MSG.CART_EMPTY_FLASH);
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
            totalDiscount: truncCurrency(totalDiscount),
            subTotal: truncCurrency(subTotal),
            searchBox: false,
            total: truncCurrency(total),
            cart,
            user,
            wallet,
            categories,
            taxAmount: truncCurrency(taxAmount),
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
    const { addressId, paymentMethod } = req.body;

    if (!addressId || !paymentMethod) {
        return response.error(res, MSG.ADDRESS_PAYMENT_REQUIRED, 400);
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return response.error(res, MSG.USER_NOT_FOUND, 404);
        }

        const shippingAddress = user.addressId.id(addressId);
        const cart = await Cart.findOne({ user: userId })
            .populate('items.product')
            .populate('coupon')
            .populate('items.offer');

        if (!cart.items?.length) {
            req.flash("error", MSG.CART_EMPTY_FLASH);
            return res.redirect("/user/cart");
        }

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
            shippingAddress,
            payment: {
                method: paymentMethod,
            },
            coupon: cart.coupon !== null ? {
                code: cart.coupon.couponCode,
                discount: cart.discountedValue
            } : null,
            subtotal,
            productDiscount,
            tax: truncCurrency(tax),
            total: truncCurrency(total),
        };

        const newOrder = new Order(orderDetails);

        if (paymentMethod === PAYMENT_SOURCE_RAZORPAY) {
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
                    totalAmount: newOrder.total,
                    user,
                    RAZORPAY_KEY_ID,
                });

            } catch (err) {
                response.serverError(res, err);
            }

        } else if (paymentMethod === PAYMENT_SOURCE_WALLET) {

            try {
                let wallet = await Wallet.findOne({ owner: userId, type: WALLET_TYPE_USER });

                if (!wallet) {
                    wallet = new Wallet({
                        owner: userId,
                        type: WALLET_TYPE_USER,
                        balance: 0
                    });
                }

                if (newOrder.total > wallet.balance) {
                    return response.error(res, MSG.INSUFFICIENT_WALLET, 400);
                }

                wallet.balance -= newOrder.total;
                wallet.transactions.push({
                    orderId: newOrder._id,
                    amount: newOrder.total,
                    type: 'debit',
                    source: PAYMENT_SOURCE_WALLET,
                    date: new Date(),
                });

                newOrder.payment.status = 'paid';
                let adminWallet = await Wallet.findOne({ type: WALLET_TYPE_ADMIN });
                if (!adminWallet) {
                    adminWallet = new Wallet({ type: WALLET_TYPE_ADMIN, balance: 0 });
                }
                adminWallet.balance += newOrder.total;
                adminWallet.transactions.push({
                    orderId: newOrder._id,
                    amount: newOrder.total,
                    type: 'credit',
                    source: PAYMENT_SOURCE_WALLET,
                    date: new Date(),
                });

                newOrder.payment.status = 'paid';
                await newOrder.save();
                await user.save();
                await wallet.save();
                await adminWallet.save();
                await handleStock(newOrder, false);
                await clearCart(userId);
                return response.success(res, {
                    success: true,
                    message: MSG.WALLET_PAYMENT_SUCCESS,
                    balance: wallet.balance,
                    orderType: paymentMethod,
                    newOrderId: newOrder._id
                });

            } catch (err) {
                console.error(`Error processing wallet payment: ${err.message}`);

                if (err.name === 'ValidationError') {
                    return response.error(res, MSG.INVALID_WALLET_TX, 400);
                }

                response.serverError(res, err);
            }

        } else {
            await newOrder.save();
            await user.save();

            await handleStock(newOrder, false);
            await clearCart(userId);

            return response.success(res, { success: true, orderType: paymentMethod, newOrderId: newOrder._id });
        }

    } catch (err) {
        response.serverError(res, err);
    }
};

const applyCoupon = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');

    const { inputValue } = req.body;
    const userId = req.session.user.userId;

    if (!inputValue) {
        return response.error(res, MSG.INVALID_INPUT, 400);
    }

    try {
        const [coupon, user, cart] = await Promise.all([
            Coupon.findOne({ couponCode: inputValue.toUpperCase(), isActive: true, isDeleted: false }),
            User.findById(userId),
            Cart.findOne({ user: userId }).populate('coupon').populate('items.offer').populate('items.product')
        ]);

        if (!coupon || !user || !cart) {
            return response.error(res, MSG.FAILED_APPLY_COUPON, 400);
        }

        if (!cart.items.length) {
            return response.error(res, MSG.CART_EMPTY, 400);
        }

        if (cart.coupon) {
            return response.error(res, MSG.COUPON_ALREADY_APPLIED, 409);
        }

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const expiryDate = new Date(coupon.expiry);
        expiryDate.setHours(0, 0, 0, 0);

        if (now > expiryDate) {
            return response.error(res, MSG.COUPON_EXPIRED, 400, { toast: false });
        }

        const usedCouponData = user.usedCoupons.find(c => c.couponId.toString() === coupon._id.toString());

        if (usedCouponData && usedCouponData.count >= coupon.count) {
            return response.error(res, MSG.COUPON_ALREADY_USED, 400);
        }

        let currentCartTotal = 0;
        for (const item of cart.items) {
            currentCartTotal += item.discountedPrice * item.quantity;
        }

        if (currentCartTotal < coupon.minAmount) {
            return response.error(res, MSG.COUPON_MIN_AMOUNT(coupon.minAmount), 400);
        }

        let couponDiscountAmount = 0;
        const itemCouponBreakdown = [];

        for (let i = 0; i < cart.items.length; i++) {
            const item = cart.items[i];

            if (!item.product) {
                return response.error(res, MSG.COUPON_PRODUCT_UNAVAILABLE, 400);
            }

            const itemTotal = item.discountedPrice * item.quantity;

            let itemCouponShare = 0;

            if (coupon.couponType === "price") {

                // Give the last item whatever discount remains.
                if (i === cart.items.length - 1) {
                    itemCouponShare = coupon.couponValue - couponDiscountAmount;
                } else {
                    const itemWeight = itemTotal / currentCartTotal;
                    itemCouponShare = truncCurrency(coupon.couponValue * itemWeight);
                }

            } else if (coupon.couponType === "percentage") {

                itemCouponShare = truncCurrency(itemTotal * (coupon.couponValue / 100));

            } else {
                return response.error(res, MSG.INVALID_COUPON, 400);
            }

            const itemCouponPercentage = truncCurrency(
                (itemCouponShare / itemTotal) * 100
            );

            itemCouponBreakdown.push({
                itemId: item._id,
                amount: itemCouponShare,
                percentage: itemCouponPercentage
            });

            const simulatedPrice = itemTotal - itemCouponShare;

            const absoluteMinFloor = truncCurrency(item.product.productPrice * item.quantity * 0.10);

            if (simulatedPrice < absoluteMinFloor) {
                return response.error(res, MSG.COUPON_PRICE_FLOOR(item.product.productName), 400);
            }

            couponDiscountAmount += itemCouponShare;
        }

        cart.discountedValue = couponDiscountAmount;
        cart.coupon = coupon._id;
        await cart.save();

        return response.success(res, {
            success: true,
            message: MSG.COUPON_APPLIED,
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
            return response.error(res, MSG.PAYMENT_VERIFY_FAILED, 400);
        }

        const order = await Order.findByIdAndUpdate(
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
                new: true,
                runValidators: true
            }
        );

        let adminWallet = await Wallet.findOne({ type: WALLET_TYPE_ADMIN });
        if (!adminWallet) {
            adminWallet = new Wallet({ type: WALLET_TYPE_ADMIN, balance: 0 });
        }
        adminWallet.balance += order.total;
        adminWallet.transactions.push({
            orderId: order._id,
            amount: order.total,
            type: 'credit',
            source: PAYMENT_SOURCE_RAZORPAY,
            date: new Date(),
        });
        await adminWallet.save();

        await clearCart(userId);

        return response.success(res, {}, MSG.PAYMENT_VERIFIED);
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
                    status: 'payment_failed',
                    'payment.status': 'failed',
                }
            },
            { new: true, runValidators: true }
        );

        if (!order) {
            return response.error(res, MSG.ORDER_NOT_FOUND_CHECKOUT, 400);
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
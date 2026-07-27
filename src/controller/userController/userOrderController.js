const mongoose = require('mongoose');
const { truncCurrency } = require('../../utils/currencyUtils');
const { updateStock } = require('../../utils/stockUtils');
const R = require('../../constants/redirects');
const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const { WALLET_TYPE_USER, WALLET_TYPE_ADMIN } = require('../../constants/walletTypes');
const { PAYMENT_SOURCE_WALLET, PAYMENT_SOURCE_RAZORPAY } = require('../../constants/paymentSources');
const Wallet = require('../../model/walletModel');
const Order = require('../../model/orderModel');
const User = require('../../model/userModel');
const Category = require('../../model/categoryModel');
const crypto = require('crypto');
const { generateInvoicePDF } = require('../../Services/invoiceService');
require('dotenv').config();

//* Razorpay configuration.
const razorPayInstance = require('../../Services/razorPay');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

const updateOrderStatus = (order) => {
    const statuses = order.items.map(item => item.status);

    const all = (status) => statuses.every(s => s === status);
    const some = (status) => statuses.some(s => s === status);

    if (all("cancelled")) {
        return "cancelled";
    }

    if (all("returned")) {
        return "returned";
    }

    if (some("returned")) {
        return "partially_returned";
    }

    if (all("delivered")) {
        return "delivered";
    }

    if (some("delivered")) {
        return "partially_delivered";
    }

    if (some("shipped")) {
        return "shipped";
    }

    return "processing";
};

// ----------------------------------------

const getOrders = async (req, res) => {
    if (!req.session.user) return res.redirect(R.USER_SIGNIN);

    const userId = req.session.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const search = req.query.search || '';
    const date = req.query.date || '';
    const statusFilter = req.query.status || '';

    let filter = { user: userId }

    if (statusFilter && ['processing', 'shipped', 'delivered', 'cancelled', 'returned', 'payment_failed', 'partially_returned', 'partially_delivered'].includes(statusFilter)) {
        filter.status = statusFilter;
    }

    if (search) {
        const objectIdRegex = /^[0-9a-f]{24}$/i;

        if (objectIdRegex.test(search)) {
            filter._id = new mongoose.Types.ObjectId(search);
        } else if (search.length >= 3) {
            const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$expr = {
                $regexMatch: {
                    input: { $toString: '$_id' },
                    regex: escaped + '$'
                }
            };
        }
    }

    if (date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

        if (dateRegex.test(date)) {
            const startOfDay = new Date(`${date}T00:00:00.000Z`);
            const endOfDay = new Date(`${date}T23:59:59.999Z`);

            filter.createdAt = {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }
    }

    try {
        const totalOrders = await Order.countDocuments(filter);

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const categories = await Category.find({ isActive: { $ne: false } });

        res.render('user/userOrders', {
            title: 'My Orders',
            totalPages: Math.ceil(totalOrders / limit),
            currentPage: page,
            search: search,
            date: date,
            statusFilter: statusFilter,
            orders,
            limit,
            user: req.session.user || null,
            categories,
        })

    } catch (err) {
        return response.serverError(res, err);
    }
}

const requestProductReturn = async (req, res) => {
    if (!req.session.user) return res.redirect(R.USER_SIGNIN);

    const { productId, orderItemId, reason } = req.body;

    try {
        const order = await Order.findOneAndUpdate(
            { 'items._id': orderItemId, 'items.productId': productId },
            {
                $set:
                {
                    'items.$.return.status': 'requested',
                    'items.$.return.reason': reason,
                    status: 'processing'
                }
            },
            { new: true, runValidators: true }
        );

        if (!order) return response.error(res, MSG.RETURN_FAILED_LOAD, 400);

        response.success(res, {}, MSG.RETURN_ORDER_SUCCESS)

    } catch (err) {
        return response.serverError(res, err);
    }
};

const cancelProduct = async (req, res) => {
    if (!req.session.user) return res.redirect(R.USER_SIGNIN);

    const { orderItemId, orderId } = req.body;
    const userId = req.session.user.userId;

    try {
        const [user, order] = await Promise.all([
            User.findById(userId),
            Order.findById(orderId),
        ]);

        if (!user || !order) {
            return response.error(res, !user ? MSG.USER_NOT_FOUND : MSG.ORDER_NOT_FOUND, 404);
        }

        const item = order.items.id(orderItemId);

        if (!item) {
            return response.error(res, MSG.PRODUCT_NOT_FOUND_ORDER, 404);
        }

        if (item.status === "cancelled") {
            return response.error(res, MSG.ITEM_ALREADY_CANCELLED, 400);
        }

        const stockUpdated = await updateStock([item], true);

        if (!stockUpdated) {
            return response.error(res, MSG.CANCELLATION_FAILED, 500);
        }

        item.status = "cancelled";

        // Update order status
        order.status = updateOrderStatus(order);

        const shouldRefund =
            order.payment.status === "paid" &&
            [PAYMENT_SOURCE_WALLET, PAYMENT_SOURCE_RAZORPAY].includes(order.payment.method);

        if (shouldRefund) {
            let wallet = await Wallet.findOne({ owner: userId, type: WALLET_TYPE_USER });

            if (!wallet) {
                wallet = new Wallet({
                    owner: userId,
                    type: WALLET_TYPE_USER,
                    balance: 0,
                    transactions: [],
                });
            }

            const itemTotal = item.finalPrice * item.quantity;
            const discountedSubtotal = order.items.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);
            const ratio = itemTotal / discountedSubtotal;

            const couponShare = (order.coupon?.discount ?? 0) * ratio;
            const taxShare = (order.tax ?? 0) * ratio;

            const refund = truncCurrency(itemTotal + taxShare - couponShare);

            wallet.transactions.push({
                orderId: order._id,
                amount: refund,
                type: "credit",
                refunded: true,
            });

            wallet.balance += refund;

            // Mark payment refunded only when the whole order is cancelled
            if (order.status === "cancelled") {
                order.payment.status = "refunded";
            }

            let adminWallet = await Wallet.findOne({ type: WALLET_TYPE_ADMIN });
            if (!adminWallet) {
                adminWallet = new Wallet({ type: WALLET_TYPE_ADMIN, balance: 0 });
            }
            adminWallet.balance -= refund;
            adminWallet.transactions.push({
                orderId: order._id,
                amount: refund,
                type: 'debit',
                refunded: true,
            });

            await Promise.all([
                wallet.save(),
                adminWallet.save(),
                order.save(),
            ]);

            return response.success(res, {}, MSG.CANCELLED_REFUND);
        }

        await order.save();

        return response.success(res, {}, MSG.CANCELLED_NO_REFUND);

    } catch (err) {
        return response.serverError(res, err);
    }
};

const retryPayment = async (req, res) => {
    if (!req.session.user) return res.redirect(R.USER_SIGNIN);
    const userId = req.session.user.userId;

    try {
        const { orderId } = req.body;

        const user = await User.findById(userId)
        const repayingOrder = await Order.findById(orderId);

        if (!repayingOrder || !user) {
            return response.error(res, MSG.ORDER_USER_NOT_FOUND, 400);
        }

        if (repayingOrder.payment.status !== 'failed' || repayingOrder.payment.method !== PAYMENT_SOURCE_RAZORPAY) {
            return response.error(res, MSG.ORDER_NOT_ELIGIBLE_RETRY, 400);
        }

        const totalPay = repayingOrder.total;

        const options = {
            amount: Math.round(totalPay * 100),
            currency: 'INR',
            receipt: `receipt_retry_${new Date().getTime()}`,
            payment_capture: 1
        };

        const order = await razorPayInstance.orders.create(options);

        return response.success(res, {
            success: true,
            razorPayOrderId: order.id,
            amount: order.amount,
            currency: order.currency,
            RAZORPAY_KEY_ID,
            address: repayingOrder.shippingAddress,
            orderId: repayingOrder._id,
            user,
        });

    } catch (err) {
        return response.serverError(res, err);
    }
};

const verifyRetryPayment = async (req, res) => {
    if (!req.session.user) return res.redirect(R.USER_SIGNIN);

    const { razorpayPaymentId, razorpayOrderId, signature, orderId } = req.body;

    try {
        const generatedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (generatedSignature !== signature) {
            return response.error(res, MSG.PAYMENT_VERIFY_FAILED, 400);
        }

        const order = await Order.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    status: 'processing',
                    'payment.status': 'paid',
                    'payment.transactionId': razorpayPaymentId,
                    'payment.gatewayOrderId': razorpayOrderId,
                    'payment.paidAt': new Date()
                }
            },
            { new: true, runValidators: true }
        );

        if (!order) {
            return response.error(res, MSG.ORDER_NOT_FOUND, 404);
        }

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

        return response.success(res, { success: true }, MSG.PAYMENT_VERIFIED);
    } catch (err) {
        return response.serverError(res, err);
    }
};

const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.query;
        if (!orderId) return response.error(res, MSG.ORDER_ID_REQUIRED, 400);

        const order = await Order.findById(orderId);
        if (!order) return response.error(res, MSG.ORDER_NOT_FOUND, 404);

        const userId = req.session?.user?.userId;
        if (!userId || order.user.toString() !== userId) {
            return response.error(res, MSG.UNAUTHORIZED_ORDER, 403);
        }

        const deliveredItems = order.items.filter(item => item.status === 'delivered');
        if (!deliveredItems.length) {
            return response.error(res, MSG.NO_DELIVERED_ITEMS, 400);
        }

        generateInvoicePDF(res, order, deliveredItems, { showStatus: false });

    } catch (err) {
        return response.serverError(res, err);
    }
};



module.exports = {
    downloadInvoice,
    requestProductReturn,
    cancelProduct,
    retryPayment,
    verifyRetryPayment,
    getOrders,
}
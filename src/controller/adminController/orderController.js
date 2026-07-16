const { truncCurrency } = require('../../utils/currencyUtils');
const mongoose = require('mongoose');
const { updateStock } = require('../../utils/stockUtils');
const { escapeRegex } = require('../../utils/regexUtils');
const R = require('../../constants/redirects');
const response = require('../../Services/responseMapper');
const MSG = require('../../constants/messages');
const { WALLET_TYPE_USER, WALLET_TYPE_ADMIN } = require('../../constants/walletTypes');
const { PAYMENT_SOURCE_COD, PAYMENT_SOURCE_RAZORPAY, PAYMENT_SOURCE_WALLET } = require('../../constants/paymentSources');
const Wallet = require('../../model/walletModel');
const Order = require('../../model/orderModel');

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

// -----------------------------------------------------------

const renderOrderList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const statusFilter = req.query.status || '';
        const paymentStatusFilter = req.query.paymentStatus || '';
        const paymentMethodFilter = req.query.paymentMethod || '';
        const dateFrom = req.query.dateFrom || '';
        const dateTo = req.query.dateTo || '';

        let filter = {};

        if (search) {
            const orConditions = [
                { 'items.name': { $regex: escapeRegex(search), $options: 'i' } },
                { 'items.brand': { $regex: escapeRegex(search), $options: 'i' } },
                {
                    $expr: {
                        $regexMatch: {
                            input: { $toString: '$_id' },
                            regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                            options: 'i'
                        }
                    }
                }
            ];
            if (mongoose.Types.ObjectId.isValid(search)) {
                orConditions.push({ _id: new mongoose.Types.ObjectId(search) });
            }
            filter.$or = orConditions;
        }

        if (statusFilter) {
            filter.status = statusFilter;
        }

        if (paymentStatusFilter) {
            filter['payment.status'] = paymentStatusFilter;
        }

        if (paymentMethodFilter) {
            filter['payment.method'] = paymentMethodFilter;
        }

        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const orders = await Order.find(filter)
            .populate('user')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const totalOrders = await Order.countDocuments(filter);

        res.render('admin/adminOrderList', {
            layout: 'admin/layout',
            title: 'Orders',
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            orders,
            limit,
            search,
            statusFilter,
            paymentStatusFilter,
            paymentMethodFilter,
            dateFrom,
            dateTo,
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

const renderOrderView = async (req, res) => {
    const { orderId } = req.query;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            req.flash("error", MSG.FAILED_LOAD_ORDERS, 400);
            return res.redirect(R.ADMIN_DASHBOARD);
        }

        res.render('admin/adminOrderView', { layout: 'admin/layout', title: 'Order Details', order });

    } catch (err) {
        response.serverError(res, err);
    }
}

const changeStatus = async (req, res) => {
    const { orderStatus, orderId } = req.body;

    if (!orderStatus || !orderId) {
        return response.error(res, MSG.FAILED_UPDATE_STATUS, 400);
    }

    if (!['shipped', 'delivered', 'cancelled'].includes(orderStatus)) {
        return response.error(res, MSG.INVALID_STATUS, 400);
    }

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return response.error(res, MSG.ORDER_NOT_FOUND, 404);
        }

        if (order.payment.status === 'failed') {
            return response.error(res, MSG.ORDER_FAILED_PAYMENT_STATUS, 400);
        }

        const eligibleItems = order.items.filter(item => {
            if (orderStatus === 'shipped') return item.status === 'processing';
            if (orderStatus === 'delivered') return item.status === 'shipped';
            if (orderStatus === 'cancelled') return item.status === 'processing' || item.status === 'shipped';
            return false;
        });

        if (!eligibleItems.length) {
            return response.error(res, MSG.ORDER_ELIGIBLE_STATUS(orderStatus), 400);
        }

        const cancelledFromShipped = orderStatus === 'cancelled' && eligibleItems.some(item => item.status === 'shipped');

        for (const item of eligibleItems) {
            item.status = orderStatus;
            if (orderStatus === 'delivered') {
                item.deliveredAt = new Date();
            }
        }

        if (orderStatus === 'cancelled') {
            const stockUpdated = await updateStock(eligibleItems, true);

            if (!stockUpdated) {
                return response.error(res, MSG.FAILED_RESTORE_STOCK, 500);
            }

            if (order.payment.status === "paid" && [PAYMENT_SOURCE_RAZORPAY, PAYMENT_SOURCE_WALLET].includes(order.payment.method)) {
                let wallet = await Wallet.findOne({ owner: order.user, type: WALLET_TYPE_USER });
                if (!wallet) {
                    wallet = new Wallet({ owner: order.user, type: WALLET_TYPE_USER, balance: 0, transactions: [] });
                }

                let adminWallet = await Wallet.findOne({ type: WALLET_TYPE_ADMIN });
                if (!adminWallet) {
                    adminWallet = new Wallet({ type: WALLET_TYPE_ADMIN, balance: 0 });
                }

                const discountedSubtotal = order.items.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);
                for (const item of eligibleItems) {
                    const itemTotal = item.finalPrice * item.quantity;
                    const ratio = itemTotal / discountedSubtotal;
                    const couponShare = (order.coupon?.discount ?? 0) * ratio;
                    const taxShare = (order.tax ?? 0) * ratio;
                    const refund = truncCurrency(itemTotal + taxShare - couponShare);

                    wallet.transactions.push({ orderId: order._id, amount: refund, type: "credit", refunded: true });
                    wallet.balance += refund;

                    adminWallet.transactions.push({ orderId: order._id, amount: refund, type: 'debit', refunded: true });
                    adminWallet.balance -= refund;
                }

                try {
                    order.status = updateOrderStatus(order);
                    await Promise.all([wallet.save(), adminWallet.save(), order.save()]);
                } catch (err) {
                    await updateStock(eligibleItems, false);
                    throw err;
                }
            } else {
                order.status = updateOrderStatus(order);
                if (order.status === 'delivered' && order.payment.status === 'pending') order.payment.status = 'paid';
                if (cancelledFromShipped && order.payment.method === PAYMENT_SOURCE_COD && order.payment.status === 'pending') {
                    order.payment.status = 'failed';
                }
                await order.save();
            }

            return response.success(res, { success: true }, MSG.STATUS_CHANGED);
        }

        order.status = updateOrderStatus(order);
        if (order.status === 'delivered' && order.payment.status === 'pending') {
            order.payment.status = 'paid';
            order.payment.paidAt = new Date();

            if (order.payment.method === PAYMENT_SOURCE_COD) {
                let adminWallet = await Wallet.findOne({ type: WALLET_TYPE_ADMIN });
                if (!adminWallet) {
                    adminWallet = new Wallet({ type: WALLET_TYPE_ADMIN, balance: 0 });
                }
                adminWallet.balance += order.total;
                adminWallet.transactions.push({
                    orderId: order._id,
                    amount: order.total,
                    type: 'credit',
                    source: PAYMENT_SOURCE_COD,
                    date: new Date(),
                });
                await adminWallet.save();
            }
        }

        await order.save();

        return response.success(res, { success: true }, MSG.STATUS_CHANGED);

    } catch (err) {
        return response.serverError(res, err);
    }
};


module.exports = {
    renderOrderView,
    renderOrderList,
    changeStatus,
    updateOrderStatus,
}
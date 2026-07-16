const { truncCurrency } = require('../../utils/currencyUtils');
const mongoose = require('mongoose');
const { updateStock } = require('../../utils/stockUtils');
const response = require('../../Services/responseMapper');
const MSG = require('../../constants/messages');
const Wallet = require('../../model/walletModel');
const Order = require('../../model/orderModel');
const { updateOrderStatus } = require('./orderController');

const renderReturnsPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const statusFilter = req.query.status || 'all';

        const matchFilter = statusFilter === 'all'
            ? { 'items.return.status': { $in: ['requested', 'approved', 'rejected', 'completed'] } }
            : { 'items.return.status': statusFilter };

        const orders = await Order.find(matchFilter)
            .populate('user', 'username email')
            .sort({ updatedAt: -1 });

        const returns = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.return?.status && (statusFilter === 'all' || item.return.status === statusFilter)) {
                    returns.push({
                        orderId: order._id,
                        orderDate: order.createdAt,
                        itemId: item._id,
                        productName: item.name,
                        productImage: item.image,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        reason: item.return.reason,
                        returnStatus: item.return.status,
                        refundedAmount: item.return.refundedAmount,
                        requestedAt: item.return.requestedAt || order.updatedAt,
                        user: order.user,
                    });
                }
            });
        });

        const totalReturns = returns.length;
        const paginated = returns.slice((page - 1) * limit, page * limit);

        res.render('admin/adminReturns', {
            layout: false,
            title: 'Returns',
            returns: paginated,
            currentPage: page,
            totalPages: Math.ceil(totalReturns / limit) || 1,
            statusFilter,
        });

    } catch (err) {
        console.error('Returns page error:', err);
        res.status(500).send(MSG.SERVER_ERROR);
    }
};

const returnStatus = async (req, res) => {
    const { orderItemId, orderId, status, reason } = req.body;

    if (!orderItemId || !orderId) {
        return response.error(res, MSG.RETURN_FAILED_LOAD, 400);
    }

    if (!["approved", "rejected"].includes(status)) {
        return response.error(res, MSG.RETURN_INVALID_STATUS, 400);
    }

    if (status === "rejected" && !reason?.trim()) {
        return response.error(res, MSG.RETURN_REJECT_REASON_REQUIRED, 400);
    }

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return response.error(res, MSG.ORDER_NOT_FOUND, 404);
        }

        const item = order.items.id(orderItemId);

        if (!item) {
            return response.error(res, MSG.RETURN_ORDER_ITEM_NOT_FOUND, 404);
        }

        if (!item.return || item.return.status !== "requested") {
            return response.error(res, MSG.RETURN_NO_PENDING, 400);
        }

        if (status === "approved") {
            let wallet = await Wallet.findOne({ owner: order.user, type: WALLET_TYPE_USER });

            if (!wallet) {
                wallet = new Wallet({
                    owner: order.user,
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

            const refundedAmount = truncCurrency(itemTotal + taxShare - couponShare);

            item.status = "returned";

            item.return.status = "approved";
            item.return.refundedAmount = refundedAmount;

            wallet.transactions.push({
                orderId: order._id,
                amount: refundedAmount,
                type: "credit",
                refunded: true,
            });

            wallet.balance += refundedAmount;

            const stockUpdated = await updateStock([item], true);
            let stockWarning = false;
            if (!stockUpdated) {
                console.warn(`[Stock restore failed] Order: ${orderId}, Item: ${orderItemId}, Product: ${item.productId}`);
                stockWarning = true;
            }

            order.status = updateOrderStatus(order);

            if (order.status === "returned") {
                order.payment.status = "refunded";
            }

            let adminWallet = await Wallet.findOne({ type: WALLET_TYPE_ADMIN });
            if (!adminWallet) {
                adminWallet = new Wallet({ type: WALLET_TYPE_ADMIN, balance: 0 });
            }
            adminWallet.balance -= refundedAmount;
            adminWallet.transactions.push({
                orderId: order._id,
                amount: refundedAmount,
                type: 'debit',
                refunded: true,
            });

            await Promise.all([
                wallet.save(),
                adminWallet.save(),
                order.save(),
            ]);

            const msg = stockWarning
                ? MSG.RETURN_APPROVED_STOCK_FAIL
                : MSG.RETURN_APPROVED;
            return response.success(res, { stockWarning }, msg);
        }

        item.return.status = "rejected";
        item.return.reason = reason;

        await order.save();

        return response.success(res, {}, MSG.RETURN_REJECTED);

    } catch (err) {
        return response.serverError(res, err);
    }
};

module.exports = { renderReturnsPage, returnStatus };

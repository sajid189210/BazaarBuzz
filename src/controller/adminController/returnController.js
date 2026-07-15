const mongoose = require('mongoose');
const response = require('../../Services/responseMapper');
const { WALLET_TYPE_USER, WALLET_TYPE_ADMIN } = require('../../constants/walletTypes');
const Product = require('../../model/productModel');
const Wallet = require('../../model/walletModel');
const Order = require('../../model/orderModel');
const { adjustStock, updateOrderStatus } = require('./orderController');

const renderReturnsPage = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;

        const orders = await Order.find({ 'items.return.status': 'requested' })
            .populate('user', 'username email')
            .sort({ updatedAt: -1 });

        const returns = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.return?.status === 'requested') {
                    returns.push({
                        orderId: order._id,
                        orderDate: order.createdAt,
                        itemId: item._id,
                        productName: item.name,
                        productImage: item.image,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        reason: item.return.reason,
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
        });

    } catch (err) {
        console.error('Returns page error:', err);
        res.status(500).send('Server error');
    }
};

const returnStatus = async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/signIn");

    const { orderItemId, orderId, status, reason } = req.body;

    if (!orderItemId || !orderId) {
        return response.error(res, "Failed to load product data.", 400);
    }

    if (!["approved", "rejected"].includes(status)) {
        return response.error(res, "Invalid return status.", 400);
    }

    if (status === "rejected" && !reason?.trim()) {
        return response.error(res, "Please provide a reason for rejecting the return.", 400);
    }

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return response.error(res, "Order not found.", 404);
        }

        const item = order.items.id(orderItemId);

        if (!item) {
            return response.error(res, "Order item not found.", 404);
        }

        if (!item.return || item.return.status !== "requested") {
            return response.error(res, "No pending return request found.", 400);
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
            const ratio = itemTotal / order.subtotal;

            const couponShare = (order.coupon?.discount ?? 0) * ratio;

            const taxShare = (order.tax ?? 0) * ratio;

            const refundedAmount = itemTotal + taxShare - couponShare;

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

            const stockUpdated = await adjustStock([item], true);

            if (!stockUpdated) {
                return response.error(res, "Failed to restore product stock.", 500);
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

            return response.success(res, {}, "Return request approved successfully.");
        }

        item.return.status = "rejected";
        item.return.reason = reason;

        await order.save();

        return response.success(res, {}, "Return request rejected successfully.");

    } catch (err) {
        return response.serverError(res, err);
    }
};

module.exports = { renderReturnsPage, returnStatus };

const response = require('../../Services/responseMapper');
const Wallet = require('../../model/walletModel');
const Order = require('../../model/orderModel');

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
    if (!req.session.admin) return res.redirect('/admin/signIn');

    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        let filter = {};

        if (search) {
            filter._id = search;
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
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

const renderOrderView = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');

    const { orderId } = req.query;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            req.flash("error", "Failed to load orders.", 400);
            return res.redirect('/admin/dashboard');
        }

        res.render('admin/adminOrderView', { layout: 'admin/layout', title: 'Order Details', order });

    } catch (err) {
        response.serverError(res, err);
    }
}

const changeStatus = async (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/signIn");

    const { orderStatus, orderId, orderItemId } = req.body;

    if (!orderStatus || !orderId || !orderItemId) {
        return response.error(res, "Failed to update status.", 400);
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

        if (item.status === orderStatus) {
            return response.error(res, "Order item is already in this status.", 400);
        }

        item.status = orderStatus;

        if (orderStatus === "cancelled") {
            const stockUpdated = await handleStock(order, true);

            if (!stockUpdated) {
                return response.error(res, "Failed to restore product stock.", 500);
            }

            if (order.payment.status === "paid" && ["razorpay", "wallet"].includes(order.payment.method)) {
                let wallet = await Wallet.findOne({ user: order.user });

                if (!wallet) {
                    wallet = new Wallet({
                        userId: order.user,
                        balance: 0,
                        transactions: [],
                    });
                }

                const itemTotal = item.finalPrice * item.quantity;
                const ratio = itemTotal / order.subtotal;

                const couponShare = (order.coupon?.discount ?? 0) * ratio;

                const taxShare = (order.tax ?? 0) * ratio;

                const refund = itemTotal + taxShare - couponShare;

                wallet.transactions.push({
                    orderId: order._id,
                    amount: refund,
                    type: "credit",
                    refunded: true,
                });

                wallet.balance += refund;

                try {
                    order.status = updateOrderStatus(order);

                    await Promise.all([
                        wallet.save(),
                        order.save(),
                    ]);

                } catch (err) {
                    await handleStock(order, false);
                    throw err;
                }
            } else {
                order.status = updateOrderStatus(order);
                await order.save();
            }

            return response.success(res, { success: true }, "Status changed successfully.");
        }

        order.status = updateOrderStatus(order);

        await order.save();

        return response.success(res, { success: true }, "Status changed successfully.");

    } catch (err) {
        return response.serverError(res, err);
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
            let wallet = await Wallet.findOne({ user: order.user });

            if (!wallet) {
                wallet = new Wallet({
                    user: order.user,
                    balance: 0,
                    transactions: [],
                });
            }

            const itemTotal = item.finalPrice * item.quantity;
            const ratio = itemTotal / order.subtotal;

            const couponShare = (order.coupon?.discount ?? 0) * ratio;

            const taxShare =
                (order.tax ?? 0) * ratio;

            const refundedAmount =
                itemTotal + taxShare - couponShare;

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

            const stockUpdated = await handleStock(order, true);

            if (!stockUpdated) {
                return response.error(
                    res,
                    "Failed to restore product stock.",
                    500
                );
            }

            order.status = updateOrderStatus(order);

            if (order.status === "returned") {
                order.payment.status = "refunded";
            }

            await Promise.all([
                wallet.save(),
                order.save(),
            ]);

            return response.success(res, {}, "Return request approved successfully.");
        }

        // Rejected
        item.return.status = "rejected";
        item.return.reason = reason;

        await order.save();

        return response.success(res, {}, "Return request rejected successfully.");

    } catch (err) {
        return response.serverError(res, err);
    }
};

const refund = async (req, res) => {
    const { productId, orderItemId } = req.body;
    try {

        // Validate input
        if (!orderItemId || !productId) {
            return response.error(res, "orderItemId and productId are required", 400);
        }

        // Update the order's return and payment status
        const order = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            {
                $set: {
                    'orderedProducts.$.returnStatus': 'refunded',
                    'orderedProducts.$.paymentStatus': 'refunded',
                    'orderedProducts.$.orderStatus': 'returned',
                }
            },
            { new: true }
        ).populate('coupon');

        // Check if all ordered products are marked as returned
        const allReturned = order.orderedProducts.every(item => item.paymentStatus === 'refunded');

        // If all items are returned, update the order status
        if (allReturned) {
            await Order.findOneAndUpdate(
                { _id: order._id },
                {
                    $set:
                    {
                        allOrdersStatus: 'returned',
                        paymentStatus: 'refunded'
                    }
                }
            );
        }

        if (!order) {
            return response.error(res, "Error while processing the refund", 400);
        }

        // Calculate total amount to refund
        let totalAmount = order.orderedProducts.reduce((acc, product) => acc + product.totalPay, 0);
        if (order.coupon) {
            totalAmount += order.coupon.couponValue;
        }

        const transactionDetails = {
            orderId: order._id,
            amount: totalAmount,
            type: 'credit',
            refunded: true
        }

        // Update user wallet balance
        const updatedWallet = await Wallet.findOneAndUpdate(
            { user: order.user },
            {
                $push: { transactions: transactionDetails },
                $inc: { balance: totalAmount }
            },
            { new: true }
        );

        if (!updatedWallet) {
            return response.error(res, "User wallet not found", 404);
        }

        res.json({ success: true, message: 'Refund processed successfully' });

    } catch (err) {
        response.serverError(res, err);
    }
};


module.exports = {
    renderOrderView,
    renderOrderList,
    returnStatus,
    changeStatus,
    refund
}
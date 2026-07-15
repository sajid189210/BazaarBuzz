const response = require('../../Services/responseMapper');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Wallet = require('../../model/walletModel');
const Order = require('../../model/orderModel');
const User = require('../../model/userModel');

const PDFDocument = require('pdfkit');
require('dotenv').config();

//* Razorpay configuration.
const razorPayInstance = require('../../Services/razorPay');
const { RAZORPAY_KEY_ID } = process.env;

const handleStock = async (item, increment) => {
    const quantity = increment ? item.quantity : -item.quantity;

    const product = await Product.findOneAndUpdate(
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
        {
            new: true,
            runValidators: true,
        }
    );

    return !!product;
};

//? Validate date
const validateDate = (date) => {
    const [month, day, year] = date.split('/').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    return { startOfDay, endOfDay }
}

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
    if (!req.session.user) return res.redirect('/user/signIn');

    const userId = req.session.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    let filter = { user: userId }

    if (search) {
        const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

        if (regex.test(search)) {
            const { startOfDay, endOfDay } = validateDate(search);

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
            searchBox: false,
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
    if (!req.session.user) return res.redirect('/user/signIn');

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

        if (!order) return response.error(res, "Failed to request return request.", 400);

        response.success(res, {}, "Order successfully requested for return. Order will be returned when approved.")

    } catch (err) {
        return response.serverError(res, err);
    }
};

const cancelProduct = async (req, res) => {
    if (!req.session.user) return res.redirect("/user/signIn");

    const { orderItemId, orderId } = req.body;
    const userId = req.session.user.userId;

    try {
        const [user, order] = await Promise.all([
            User.findById(userId),
            Order.findById(orderId),
        ]);

        if (!user || !order) {
            return response.error(res, !user ? "User not found." : "Order not found.", 404);
        }

        const item = order.items.id(orderItemId);

        if (!item) {
            return response.error(res, "Product not found in this order.", 404);
        }

        if (item.status === "cancelled") {
            return response.error(res, "This product has already been cancelled.", 400);
        }

        // Restore stock only for this item
        const stockUpdated = await handleStock(item, true);

        if (!stockUpdated) {
            return response.error(res, "Failed to process cancellation.", 500);
        }

        item.status = "cancelled";

        // Update order status
        order.status = updateOrderStatus(order);

        const shouldRefund =
            order.payment.status === "paid" &&
            ["wallet", "razorpay"].includes(order.payment.method);

        if (shouldRefund) {
            let wallet = await Wallet.findOne({ owner: userId, type: 'user' });

            if (!wallet) {
                wallet = new Wallet({
                    owner: userId,
                    type: 'user',
                    balance: 0,
                    transactions: [],
                });
            }

            const itemTotal = item.finalPrice * item.quantity;
            const ratio = itemTotal / order.subtotal;

            const couponShare = (order.coupon?.discount ?? 0) * ratio;
            const taxShare = (order.tax ?? 0) * ratio;

            const refund = Number(
                (itemTotal + taxShare - couponShare).toFixed(2)
            );

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

            await Promise.all([
                wallet.save(),
                order.save(),
            ]);

            return response.success(res, {}, "You have cancelled the product. The refund has been credited to your wallet.");
        }

        await order.save();

        return response.success(res, {}, "You have cancelled the product.");

    } catch (err) {
        return response.serverError(res, err);
    }
};

const retryPayment = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');
    const userId = req.session.user.userId;

    try {
        const { orderId } = req.body;

        const user = await User.findById(userId)
        const repayingOrder = await Order.findById(orderId);

        if (!repayingOrder || !user) {
            return response.error(res, "Order or user was not found", 400);
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

const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.query;
        const order = await Order.findById(orderId);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');

        doc.pipe(res);

        // Header Section
        doc
            .fontSize(20)
            .text('INVOICE', { align: 'center' })
            .moveDown(1.5);

        // Invoice and Customer Details
        doc
            .fontSize(12)
            .text(`Name: ${order.shippingAddress.contactName}`, { align: 'left' })
            .text(`Phone Number: ${order.shippingAddress.contactNumber}`)
            .text(`Email: ${order.shippingAddress.email || 'N/A'}`)
            .text(
                `Address: ${order.shippingAddress.building}, ${order.shippingAddress.street}, ${order.shippingAddress.district}, ${order.shippingAddress.state}, ${order.shippingAddress.pincode}`
            )
            .moveDown();

        doc
            .text(`Invoice No.: ${order._id}`, { align: 'left' })
            .text(`Invoice Date: ${new Date(order.createdAt).toLocaleDateString()}`)
            .moveDown(2);

        // Table Header
        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Products', { underline: true, align: 'left' })
            .moveDown();

        // Table Columns
        const tableTop = doc.y;
        const columnSpacing = 100;
        const startX = doc.x;

        doc
            .fontSize(10)
            .text('SLNo.', startX, tableTop)
            .text('Name', startX + columnSpacing, tableTop)
            .text('Quantity', startX + columnSpacing * 2, tableTop)
            .text('Price', startX + columnSpacing * 3, tableTop)
            .text('Amount', startX + columnSpacing * 5, tableTop)
            .moveDown(3);

        // Ordered Products
        order.items.forEach((item, index) => {
            const y = doc.y;

            doc
                .font('Helvetica')
                .fontSize(10)
                .text(index + 1, startX, y)
                .text(item.name, startX + columnSpacing, y, { width: columnSpacing - 10, align: 'left' })
                .text(item.quantity, startX + columnSpacing * 2, y)
                .text(`${item.unitPrice.toFixed(2)}`, startX + columnSpacing * 3, y)
                .text(`${item.finalPrice.toFixed(2)}`, startX + columnSpacing * 5, y);

            doc.moveDown(8);
        });

        const totalSectionTop = doc.y;

        doc
            .font('Helvetica')
            .fontSize(12)
            .text(`Sub Total: ${order.subtotal.toFixed(2)}`, startX, doc.y, { align: 'right' })
            .moveDown();

        doc
            .font('Helvetica')
            .fontSize(12)
            .text(`Total Tax (5%): ${order.tax.toFixed(2)}`, startX + columnSpacing, totalSectionTop + 15, { align: 'right' })
            .moveDown(3);


        doc
            .font('Helvetica-Bold')
            .fontSize(12)
            .text(`Total Amount: ${(order.total).toFixed(2)}`, startX + columnSpacing * 2, totalSectionTop + 30, { align: 'right' })
            .moveDown();

        doc.end();

    } catch (err) {
        return response.serverError(res, err);
    }
};



module.exports = {
    downloadInvoice,
    requestProductReturn,
    cancelProduct,
    retryPayment,
    getOrders,
}
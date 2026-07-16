const { truncCurrency } = require('../../utils/currencyUtils');
const colorName = require('../../utils/colorName').name;
const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const { WALLET_TYPE_USER, WALLET_TYPE_ADMIN } = require('../../constants/walletTypes');
const { PAYMENT_SOURCE_WALLET, PAYMENT_SOURCE_RAZORPAY } = require('../../constants/paymentSources');
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
                    colors: item.selectedColor,
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

        if (!order) return response.error(res, MSG.RETURN_FAILED_LOAD, 400);

        response.success(res, {}, MSG.RETURN_ORDER_SUCCESS)

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
            return response.error(res, !user ? MSG.USER_NOT_FOUND : MSG.ORDER_NOT_FOUND, 404);
        }

        const item = order.items.id(orderItemId);

        if (!item) {
            return response.error(res, MSG.PRODUCT_NOT_FOUND_ORDER, 404);
        }

        if (item.status === "cancelled") {
            return response.error(res, MSG.ITEM_ALREADY_CANCELLED, 400);
        }

        // Restore stock only for this item
        const stockUpdated = await handleStock(item, true);

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
    if (!req.session.user) return res.redirect('/user/signIn');
    const userId = req.session.user.userId;

    try {
        const { orderId } = req.body;

        const user = await User.findById(userId)
        const repayingOrder = await Order.findById(orderId);

        if (!repayingOrder || !user) {
            return response.error(res, MSG.ORDER_USER_NOT_FOUND, 400);
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

        // --- Proportional cost calculation (mirrors return logic) ---
        const deliveredGross = deliveredItems.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);
        const totalGross = order.items.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);
        const ratio = totalGross > 0 ? deliveredGross / totalGross : 0;

        const couponDiscount = truncCurrency((order.coupon?.discount || 0) * ratio);
        const invoiceTax = truncCurrency((order.tax || 0) * ratio);
        const invoiceShipping = truncCurrency((order.shippingFee || 0) * ratio);
        const grandTotal = truncCurrency(deliveredGross - couponDiscount + invoiceTax + invoiceShipping);

        // --- PDF Generation ---
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);

        doc.pipe(res);

        const BLUE = '#1e40af';
        const GRAY = '#6b7280';
        const DARK = '#1f2937';
        const LIGHT_BG = '#f3f4f6';
        const MARGIN = 50;
        const PAGE_WIDTH = 595.28;
        const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

        // ─────── HEADER ───────
        doc.fontSize(26).font('Helvetica-Bold').fillColor(BLUE)
            .text('BAZZARBUZZ', MARGIN, 50, { continued: false });

        doc.fontSize(9).font('Helvetica').fillColor(GRAY)
            .text('Fashion Marketplace', MARGIN, 78);

        // Invoice title right-aligned
        doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK)
            .text('TAX INVOICE', MARGIN, 50, { align: 'right' });

        // Separator
        const sepY = 105;
        doc.moveTo(MARGIN, sepY).lineTo(PAGE_WIDTH - MARGIN, sepY).strokeColor('#d1d5db').lineWidth(1).stroke();

        // ─────── INVOICE META ───────
        const metaY = sepY + 20;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(GRAY);

        const leftMeta = [
            { label: 'Invoice No.', value: `INV-${String(order._id).slice(-8).toUpperCase()}` },
            { label: 'Order ID', value: String(order._id) },
        ];
        const rightMeta = [
            { label: 'Invoice Date', value: new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
            { label: 'Payment', value: `${(order.payment?.method || '-').toUpperCase()} / ${(order.payment?.status || '-')}` },
        ];

        leftMeta.forEach((item, i) => {
            doc.text(item.label, MARGIN, metaY + i * 16);
        });
        doc.font('Helvetica').fillColor(DARK);
        leftMeta.forEach((item, i) => {
            doc.text(item.value, MARGIN + 80, metaY + i * 16);
        });

        doc.font('Helvetica-Bold').fillColor(GRAY);
        rightMeta.forEach((item, i) => {
            doc.text(item.label, PAGE_WIDTH - MARGIN - 160, metaY + i * 16);
        });
        doc.font('Helvetica').fillColor(DARK);
        rightMeta.forEach((item, i) => {
            doc.text(item.value, PAGE_WIDTH - MARGIN - 90, metaY + i * 16);
        });

        // ─────── BILL TO ───────
        const billY = metaY + 16 * Math.max(leftMeta.length, rightMeta.length) + 20;
        const sepY2 = billY;
        doc.moveTo(MARGIN, sepY2).lineTo(PAGE_WIDTH - MARGIN, sepY2).strokeColor('#d1d5db').lineWidth(1).stroke();

        const addr = order.shippingAddress;
        doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK)
            .text('Bill To:', MARGIN, sepY2 + 15);

        doc.fontSize(9).font('Helvetica').fillColor(DARK)
            .text(addr.contactName, MARGIN, sepY2 + 32);
        const addrLine = [addr.building, addr.street].filter(Boolean).join(', ') + ', ' +
            (addr.landmark ? addr.landmark + ', ' : '') +
            `${addr.district}, ${addr.state} — ${addr.pincode}`;
        doc.text(addrLine, MARGIN, sepY2 + 48, { width: CONTENT_WIDTH });
        doc.text(`Phone: ${addr.contactNumber}`, MARGIN, sepY2 + 66);

        // ─────── ITEMS TABLE ───────
        const tableY = sepY2 + 95;
        const sepY3 = tableY - 10;
        doc.moveTo(MARGIN, sepY3).lineTo(PAGE_WIDTH - MARGIN, sepY3).strokeColor('#d1d5db').lineWidth(1).stroke();

        // Table configuration — no overlapping columns
        const colPos = [MARGIN, MARGIN + 30, MARGIN + 210, MARGIN + 300, MARGIN + 340, MARGIN + 405];
        const colKeys = ['#', 'Product', 'Size / Color', 'Qty', 'Unit Price', 'Total'];
        const colWidths = [30, 180, 90, 40, 65, 65];
        const rowHeight = 22;

        // Header row background
        doc.rect(MARGIN, tableY, CONTENT_WIDTH, rowHeight).fill(LIGHT_BG);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK);
        colKeys.forEach((key, i) => {
            doc.text(key, colPos[i] + 4, tableY + 6, { width: colWidths[i] - 8, align: i === 0 ? 'center' : i >= 3 ? 'right' : 'left' });
        });

        // Data rows
        doc.fontSize(8).font('Helvetica').fillColor(DARK);
        let rowY = tableY + rowHeight;
        deliveredItems.forEach((item, idx) => {
            const hex = item.selectedColor || '#ccc';
            const cName = colorName(hex);
            const sizeText = (item.selectedSize || '-') + '  ' + cName;
            const lineTotal = (item.finalPrice * item.quantity);
            const values = [
                String(idx + 1),
                item.name || 'Product',
                sizeText,
                String(item.quantity),
                `₹${Number(item.unitPrice || 0).toFixed(2)}`,
                `₹${lineTotal.toFixed(2)}`,
            ];

            // Alternate row bg
            if (idx % 2 === 1) {
                doc.rect(MARGIN, rowY, CONTENT_WIDTH, rowHeight).fill('#fafafa');
            }

            values.forEach((val, i) => {
                if (i === 2) {
                    const dotX = colPos[i] + 4;
                    const dotY = rowY + 5;
                    const dotSize = 10;
                    doc.rect(dotX, dotY, dotSize, dotSize).fillAndStroke(hex, '#d1d5db');
                    doc.font('Helvetica').fontSize(8).fillColor(DARK);
                    doc.text(cName, dotX + dotSize + 5, rowY + 6, { width: colWidths[i] - dotSize - 13, align: 'left' });
                    doc.font('Helvetica').fontSize(7).fillColor(GRAY);
                    doc.text(item.selectedSize || '-', dotX + dotSize + 5, rowY + 6, { width: colWidths[i] - dotSize - 13, align: 'right' });
                } else {
                    const align = i === 0 ? 'center' : i >= 3 ? 'right' : 'left';
                    doc.font('Helvetica').fontSize(8).fillColor(DARK);
                    doc.text(val, colPos[i] + 4, rowY + 6, { width: colWidths[i] - 8, align });
                }
            });

            rowY += rowHeight;
        });

        // ─────── AMOUNT SUMMARY (shop style) ───────
        const summaryY = rowY + 15;
        const summaryX = PAGE_WIDTH - MARGIN - 220;
        const summaryW = 220;
        const valueX = summaryX + 80;
        const valueW = summaryW - 80;

        const sumLines = [
            { label: 'Subtotal', value: `₹${deliveredGross.toFixed(2)}`, bold: false },
        ];
        if (couponDiscount > 0) {
            sumLines.push({ label: 'Coupon', value: `-₹${couponDiscount.toFixed(2)}`, bold: false });
        }
        if (invoiceTax > 0) {
            sumLines.push({ label: 'Tax', value: `₹${invoiceTax.toFixed(2)}`, bold: false });
        }
        sumLines.push({ label: 'Shipping', value: `₹${invoiceShipping.toFixed(2)}`, bold: false });
        sumLines.push({ label: null, value: null, isLine: true });
        sumLines.push({ label: 'Grand Total', value: `₹${grandTotal.toFixed(2)}`, bold: true });

        let sy = summaryY;
        sumLines.forEach(line => {
            if (line.isLine) {
                doc.moveTo(summaryX, sy + 2).lineTo(PAGE_WIDTH - MARGIN, sy + 2).strokeColor('#d1d5db').lineWidth(1).stroke();
                sy += 10;
                return;
            }
            if (line.bold) {
                doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK);
            } else {
                doc.font('Helvetica').fontSize(9).fillColor(GRAY);
            }
            doc.text(line.label, summaryX, sy);
            doc.text(line.value, valueX, sy, { width: valueW, align: 'right' });
            sy += line.bold ? 22 : 16;
        });

        // ─────── FOOTER ───────
        const footerY = Math.max(sy + 40, 720);
        doc.moveTo(MARGIN, footerY).lineTo(PAGE_WIDTH - MARGIN, footerY).strokeColor('#d1d5db').lineWidth(1).stroke();
        doc.fontSize(9).font('Helvetica').fillColor(GRAY)
            .text('Thank you for shopping with BazaarBuzz!', MARGIN, footerY + 15, { align: 'center', width: CONTENT_WIDTH });

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
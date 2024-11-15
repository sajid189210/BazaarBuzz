const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Wallet = require('../../model/walletModel');
const Order = require('../../model/orderModel');
const User = require('../../model/userModel');

const crypto = require('crypto');
const PDF = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

//* Razorpay configuration.
const razorPayInstance = require('../../Services/razorPay');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;




//? Function to handle stocks quantity.
const handleStock = async (order, paymentMethod) => {
    const orderedProductDetails = order.orderedProducts.filter(item => item.product);

    orderedProductDetails.forEach(async (orderedProduct) => {
        const product = await Product.findById(orderedProduct.product);

        const updatedProduct = await Product.updateOne(
            { _id: orderedProduct.product.toString(), 'variants.size': orderedProduct.selectedSize },
            { $inc: { 'variants.$.stock': (1 * orderedProduct.quantity) } },
            { new: true }
        );

        if (updatedProduct.modifiedCount == 0) {
            throw new Error(`Error caught while handling stock after product purchase on ${paymentMethod}.`);
        }
    });
};



const getOrders = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');
    const userId = req.session.user.userId;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const totalOrders = await Order.countDocuments();

        const category = await Category.find();
        const orders = await Order.find({ user: userId })
            .populate('orderedProducts.product')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)

        res.render('user/userOrders', {
            totalPages: Math.ceil(totalOrders / limit),
            currentPage: page,
            category,
            orders,
            limit,
            user: req.session.user || null,
        })

    } catch (err) {
        console.error(`Error caught getOrders in the orderController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
}

const returnProduct = async (req, res) => {
    const { productId, orderItemId, reason } = req.body;
    try {
        const order = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            {
                $set:
                {
                    'orderedProducts.$.returnStatus': 'requested',
                    'orderedProducts.$.returnReason': reason,
                }
            },
            { new: true }
        );

        if (!order) return res.status(400).json({
            success: false,
            message: 'Error handling return...'
        });

        res.status(200).json({
            success: true,
            message: 'Order successfully requested for return. Order will be returned when approved.'
        })

    } catch (err) {
        console.error(`Error caught returnProducts in the orderController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const cancelProduct = async (req, res) => {
    const { productId, orderItemId, orderId } = req.body;

    // Redirect if the user is not authenticated
    if (!req.session.user) return res.redirect('/user/signIn');

    const userId = req.session.user.userId;

    try {
        // Find user, order, and wallet in parallel to reduce time complexity
        const [user, order, wallet] = await Promise.all([
            User.findOne({ _id: userId }),
            Order.findOne({ _id: orderId }).populate('coupon'),
            Wallet.findOne({ user: userId })
        ]);

        // Validate existence of user, order, and wallet
        if (!user || !order || !wallet) {
            return res.status(404).json({
                success: false, message: !user ? "User not found." : !order ? "Order not found." : "Wallet not found."
            });
        }

        const { paymentMethod, orderedProducts } = order;

        // preparing the update details based on payment method
        const updateDetails = {
            'orderedProducts.$.orderStatus': 'cancelled',
            'orderedProducts.$.paymentStatus': paymentMethod === 'razorpay' || paymentMethod === 'wallet' ? 'refunded' : 'failed',
        };

        //* Update the order status for the specific product being cancelled
        const updatedOrder = await Order.findOneAndUpdate(
            { 'orderedProducts._id': orderItemId, 'orderedProducts.product': productId },
            { $set: updateDetails },
            { new: true }
        );

        // Check if all products are cancelled and update overall order status
        if (updatedOrder.orderedProducts.every(product => product.orderStatus === 'cancelled')) {
            await Order.findByIdAndUpdate(orderId, { $set: { allOrdersStatus: 'cancelled', paymentStatus: paymentMethod === 'cod' ? 'failed' : 'refunded' } });
        }

        // increases stock.
        handleStock(order, paymentMethod);

        //* Handle online payment refunds and save the wallet history.
        if (paymentMethod === 'razorpay' || paymentMethod === 'wallet') {
            const totalAmount = orderedProducts.reduce((acc, product) => acc + product.totalPay, 0);
            if (order.coupon) totalAmount -= order.coupon.couponValue;

            // fetching the cancelled product.
            const orderedItem = order.orderedProducts.find(item => item._id.toString() === orderItemId);

            const transactionDetails = {
                orderId: order._id,
                amount: orderedItem.totalPay,
                date: new Date(),
                type: 'credit'
            };

            // Add the transaction to the wallet and save it.
            wallet.transactions.push(transactionDetails);
            wallet.save();

            const updateWalletBalance = await Wallet.findOneAndUpdate(
                { user: userId },
                { $inc: { balance: totalAmount } },
                { new: true }
            );

            if (!updateWalletBalance) {
                return res.status(400).json({
                    success: false,
                    message: 'Refund has failed.'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'You have cancelled the product. Money has been refunded into your wallet.'
            });
        }

        //* Return if payment method is COD
        return res.status(200).json({
            success: true,
            message: 'You have cancelled the product.'
        });

    } catch (err) {
        console.error(`Error caught cancelProduct in the orderController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
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
            return res.status(400).json({ success: false, message: 'Order or user was not found' });
        }

        const totalPay = repayingOrder.orderedProducts.reduce((acc, item) => acc + item.totalPay, 0);

        const options = {
            amount: Math.round(totalPay * 100),
            currency: 'INR',
            receipt: `receipt_retry_${new Date().getTime()}`,
            payment_capture: 1
        };

        razorPayInstance.orders.create(options, async (err, order) => {
            if (err) {
                console.log(err);
                return res.status(400).json({ success: false, message: `Something went wrong! ${err}` });
            }

            return res.status(200).json({
                success: true,
                razorPayOrderId: order.id,
                currency: order.currency,
                RAZORPAY_KEY_ID,
                address: repayingOrder.shippingAddress,
                orderId: repayingOrder._id,
                user,
            });
        });

    } catch (err) {
        console.error(`Error creating Razorpay order`);
        console.error(`Error caught retryPayment in the orderController${err}`);
        return res.status(500).json({
            success: false,
            message: "Payment processing failed. Please try again.",
            details: err.message
        });
    }
};

const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.query;
        const order = await Order.findById(orderId);

        // creates a new PDF document.
        const doc = new PDF({ size: 'A4', margin: 50 });

        // Setting the appropriate header for downloading PDF.
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');

        // Pipe the PDF to the response, this will send it directly to the browser.
        doc.pipe(res);

        // Title.
        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();

        // Order Details.
        doc.font('Helvetica-Bold').fontSize(14).text('Order Details', { align: 'left', underline: true });
        doc.font('Helvetica').text(`OrderID: ${order._id}`, { align: 'left' });
        doc.text(`Order Status: ${order.allOrdersStatus}`, { align: 'left' });
        doc.text(`Payment Method: ${order.paymentMethod}`, { align: 'left' });
        doc.text(`Payment Status: ${order.paymentStatus}`, { align: 'left' });
        doc.text(`Date: ${order.createdAt.toLocaleString()}`, { align: 'left' });
        doc.moveDown();

        // Shipping Address.
        doc.font('Helvetica-Bold').fontSize(14).text('Shipping Address', { align: 'left', underline: true });
        doc.font('Helvetica').text(`Contact Name: ${order.shippingAddress.contactName}`, { align: 'left' });
        doc.text(`Contact Number: ${order.shippingAddress.contactNumber}`, { align: 'left' });
        doc.text(`Building: ${order.shippingAddress.building}`, { align: 'left' });
        doc.text(`Pincode: ${order.shippingAddress.pincode}`, { align: 'left' });
        doc.text(`Street: ${order.shippingAddress.street}`, { align: 'left' });
        doc.text(`District: ${order.shippingAddress.district}`, { align: 'left' });
        doc.text(`State: ${order.shippingAddress.state}`, { align: 'left' });
        doc.moveDown();

        // Ordered Products Details.
        doc.font('Helvetica-Bold').fontSize(14).text('Ordered Products', { align: 'left', underline: true });
        order.orderedProducts.forEach(item => {
            doc.font('Helvetica').text(`Product ID: ${item.product}`)
            doc.text(`Quantity: ${item.quantity}`);
            doc.text(`Size: ${item.selectedSize}`);
            doc.text(`Color: ${item.selectedColor}`);
            doc.text(`Price Per Unit (after discount): ${item.discountedPrice.toFixed(2)}`);
            doc.text(`Total: ${item.totalPay.toFixed(2)}`);
            doc.moveDown();
        });

        // Total
        const totalAmount = order.orderedProducts.reduce((acc, item) => acc + item.totalPay, 0);
        doc.font('Helvetica-Bold').fontSize(14).text(`Total amount: ${totalAmount.toFixed(2)}`, { align: 'left' })

        // finalize the PDF.
        doc.end()

    } catch (err) {
        console.error(`Error caught downloadInvoice in the orderController${err}`);
        return res.status(500).json({
            message: err.message,
            stack: err.stack
        });
    }
};



module.exports = {
    downloadInvoice,
    returnProduct,
    cancelProduct,
    retryPayment,
    getOrders,
}
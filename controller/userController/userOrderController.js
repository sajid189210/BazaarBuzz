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




//? Function to handle stocks quantity.
const handleStock = async (order, paymentMethod) => {
    const orderedProductDetails = order.orderedProducts.filter(item => item.product);

    orderedProductDetails.forEach(async (orderedProduct) => {
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
            searchBox: false,
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
            let totalAmount = orderedProducts.reduce((acc, product) => acc + product.totalPay, 0);
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
        const order = await Order.findById(orderId).populate('orderedProducts.product');

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
            .text('Tax', startX + columnSpacing * 4, tableTop) // Corrected column position for Tax
            .text('Amount', startX + columnSpacing * 5, tableTop)
            .moveDown(3);

        let subTotal = 0; // Initialize subtotal
        let totalTax = 0; // Initialize total tax

        // Ordered Products
        order.orderedProducts.forEach((item, index) => {
            const y = doc.y;
            const tax = Math.round(item.totalPay * 0.05);
            subTotal += item.discountedPrice;
            totalTax += tax;

            doc
                .font('Helvetica')
                .fontSize(10)
                .text(index + 1, startX, y)
                .text(item.product.productName, startX + columnSpacing, y, { width: columnSpacing - 10, align: 'left' })
                .text(item.quantity, startX + columnSpacing * 2, y)
                .text(`${item.discountedPrice.toFixed(2)}`, startX + columnSpacing * 3, y)
                .text(`${tax.toFixed(2)}`, startX + columnSpacing * 4, y)
                .text(`${item.totalPay.toFixed(2)}`, startX + columnSpacing * 5, y);

            doc.moveDown(8);
        });


        // Total Amount Section
        const totalAmount = order.orderedProducts.reduce((acc, item) => acc + item.totalPay, 0);

        const totalSectionTop = doc.y;

        doc
            .font('Helvetica')
            .fontSize(12)
            .text(`Sub Total: ${subTotal.toFixed(2)}`, startX, doc.y, { align: 'right' })
            .moveDown();

        doc
            .font('Helvetica')
            .fontSize(12)
            .text(`Total Tax (5%): ${totalTax.toFixed(2)}`, startX + columnSpacing, totalSectionTop + 15, { align: 'right' })
            .moveDown(3);


        doc
            .font('Helvetica-Bold')
            .fontSize(12)
            .text(`Total Amount: ${(totalAmount).toFixed(2)}`, startX + columnSpacing * 2, totalSectionTop + 30, { align: 'right' })
            .moveDown();

        doc.end();

    } catch (err) {
        console.error(`Error in downloadInvoice: ${err}`);
        return res.status(500).json({
            message: err.message,
            stack: err.stack,
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
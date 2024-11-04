const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Coupon = require('../../model/couponModel');


const renderCouponPage = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect('/admin/signIn');

        const coupons = await Coupon.find();

        res.render('admin/coupon', { coupons });

    } catch (err) {
        console.error(`Error caught renderCouponPage in the couponController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const createCoupons = async (req, res) => {

    if (!req.session.admin) return res.redirect('/admin/signIn');

    const { couponCode, couponType, couponValue, minAmount, expiry, count } = req.body;

    // Check for required fields
    if (!couponCode || !couponType || !couponValue || !minAmount || !expiry || !count) {
        return res.status(400).json({
            success: false,
            message: 'Required fields are empty!'
        });
    }

    try {
        const existingCoupon = await Coupon.findOne({ couponCode });

        // If coupon exists
        if (existingCoupon) {
            // If the coupon type is different, create a new coupon
            if (existingCoupon.couponType !== couponType) {
                const newCoupon = new Coupon({ couponCode, couponType, couponValue, minAmount, expiry, count });
                await newCoupon.save();
                return res.status(201).json({ success: true, message: 'Coupon created successfully.' });
            }
            return res.status(400).json({ success: false, message: 'Coupon already exists.' });
        }

        // Create new coupon
        const newCoupon = new Coupon({ couponCode, couponType, couponValue, minAmount, expiry, count });
        await newCoupon.save();
        return res.status(201).json({ success: true, message: 'Coupon has been successfully created.' });

    } catch (err) {
        if (err.code === 11000) { // MongoDB duplicate key error code
            console.error(`MongoDB duplicate key error: ${err}`);
            return res.status(409).json({ success: false, message: 'Coupon code must be unique.' });
        }

        console.error(`Error in createCoupons: ${err}`);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const updateCoupons = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');

    try {
        const { couponCode, couponType, couponValue, minAmount, expiry, count } = req.body;

        // Check for required fields
        if (!couponCode || !couponType || !couponValue || !minAmount || !expiry || !count) {
            return res.status(400).json({
                success: false,
                message: 'Required fields are empty!'
            });
        }

        const updatedCoupon = await Coupon.findOneAndUpdate(
            { couponCode },
            { $set: { couponType, couponValue, minAmount, expiry, count } },
            { new: true }
        )

        if (!updatedCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon Code was not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'You have successfully updated the coupon.'
        });

    } catch (err) {
        console.error(`Error in updateCoupons: ${err}`);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const deleteCoupons = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');

    try {

        const deletedCoupon = await Coupon.findByIdAndDelete(req.query.couponId);

        if (deletedCoupon) {
            res.status(200).json({
                success: true,
                message: 'You have successfully deleted the coupon.'
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Coupon ID was not found.'
            });
        }

    } catch (err) {
        console.error(`Error in deleteCoupons : ${err}`);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
}


module.exports = {
    renderCouponPage,
    createCoupons,
    updateCoupons,
    deleteCoupons
};
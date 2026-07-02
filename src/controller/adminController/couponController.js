const response = require('../../Services/responseMapper');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Coupon = require('../../model/couponModel');


const renderCouponPage = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect('/admin/signIn');

        const coupons = await Coupon.find().lean();

        res.render('admin/coupon', { coupons });

    } catch (err) {
        response.serverError(res, err);
    }
};

const createCoupons = async (req, res) => {

    if (!req.session.admin) return res.redirect('/admin/signIn');

    const { couponCode, couponType, couponValue, minAmount, expiry, count } = req.body;

    // Check for required fields
    if (!couponCode || !couponType || !couponValue || !minAmount || !expiry || !count) {
        return response.error(res, "All fields are required", 400);
    }

    if (!['price', 'percentage'].includes(couponType)) {
        return response.error(res, "Invalid coupon type", 400);
    }

    const couponExists = await Coupon.exists({ couponCode: couponCode.toUpperCase() });
    if (couponExists) {
        return response.error(res, "Coupon already exists", 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiry);

    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
        return response.error(res, "Expiry date must be today or a future date", 400);
    }

    try {
        const newCoupon = new Coupon({
            couponCode,
            couponType,
            couponValue,
            minAmount,
            expiry: expiryDate,
            count,
        });
        await newCoupon.save();
        return response.success(res, {}, "Coupon created successfully.", 201);
    } catch (err) {
        response.serverError(res, err);
    }
};

const updateCoupons = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');

    try {
        const { couponCode, couponType, couponValue, minAmount, expiry, count, couponId } = req.body;

        // Check for required fields
        if (!couponCode || !couponType || !couponValue || !minAmount || !expiry || !count) {
            return response.error(res, "All fields are required!", 400);
        }

        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return response.error(res, 'Coupon not found.', 404);
        }

        coupon.couponCode = couponCode;
        coupon.couponType = couponType;
        coupon.couponValue = couponValue;
        coupon.minAmount = minAmount;
        coupon.expiry = expiry;
        coupon.count = count;

        await coupon.save();

        return response.success(res, {}, "You have successfully updated the coupon.");

    } catch (err) {
        response.serverError(res, err);
    }
};

const deleteCoupons = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');

    try {

        const deletedCoupon = await Coupon.findByIdAndDelete(req.query.couponId);

        if (deletedCoupon) {
            response.success(res, {}, "You have successfully deleted the coupon.");
        } else {
            response.error(res, "Coupon ID was not found.", 400);
        }

    } catch (err) {
        response.serverError(res, err);
    }
}


module.exports = {
    renderCouponPage,
    createCoupons,
    updateCoupons,
    deleteCoupons
};
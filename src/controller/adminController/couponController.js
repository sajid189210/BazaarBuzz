const response = require('../../Services/responseMapper');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Coupon = require('../../model/couponModel');


const renderCouponPage = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect('/admin/signIn');

        const coupons = await Coupon.find();

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
        return response.error(res, "Required fields are empty!", 400);
    }

    try {
        const existingCoupon = await Coupon.findOne({ couponCode });

        // If coupon exists
        if (existingCoupon) {
            // If the coupon type is different, create a new coupon
            if (existingCoupon.couponType !== couponType) {
                const newCoupon = new Coupon({ couponCode, couponType, couponValue, minAmount, expiry, count });
                await newCoupon.save();
                return response.success(res, {}, "Coupon created successfully.", 201);
            }
            return response.error(res, "Coupon already exists.", 400);
        }

        // Create new coupon
        const newCoupon = new Coupon({ couponCode, couponType, couponValue, minAmount, expiry, count });
        await newCoupon.save();
        return response.success(res, {}, "Coupon has been successfully created.", 201);

    } catch (err) {
        if (err.code === 11000) { // MongoDB duplicate key error code
            console.error(`MongoDB duplicate key error: ${err}`);
            return response.error(res, "Coupon code must be unique.", 409);
        }

        response.serverError(res, err);
    }
};

const updateCoupons = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');

    try {
        const { couponCode, couponType, couponValue, minAmount, expiry, count } = req.body;

        // Check for required fields
        if (!couponCode || !couponType || !couponValue || !minAmount || !expiry || !count) {
            return response.error(res, "Required fields are empty!", 400);
        }

        const updatedCoupon = await Coupon.findOneAndUpdate(
            { couponCode },
            { $set: { couponType, couponValue, minAmount, expiry, count } },
            { new: true }
        )

        if (!updatedCoupon) {
            return response.error(res, "Coupon Code was not found.", 400);
        }

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
const response = require('../../Services/responseMapper');
const Coupon = require('../../model/couponModel');

const renderCouponPage = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect('/admin/signIn');

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const search = req.query.search || '';
        const statusFilter = req.query.status || '';

        const filter = { isDeleted: false };

        if (search) {
            filter.$or = [
                { couponCode: { $regex: search, $options: 'i' } },
                { couponType: { $regex: search, $options: 'i' } },
            ];
        }

        if (statusFilter === 'active') filter.isActive = true;
        else if (statusFilter === 'inactive') filter.isActive = false;

        const totalCoupons = await Coupon.countDocuments(filter);
        const totalPages = Math.ceil(totalCoupons / limit);

        const coupons = await Coupon.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.render('admin/coupon', {
            layout: false,
            coupons,
            currentPage: page,
            totalPages,
            totalCoupons,
            search,
            statusFilter,
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

const createCoupons = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');

    const { couponCode, couponType, couponValue, minAmount, expiry, count } = req.body;

    if (!couponCode || !couponType || !couponValue || !minAmount || !expiry || !count) {
        return response.error(res, "All fields are required", 400);
    }

    if (!['price', 'percentage'].includes(couponType)) {
        return response.error(res, "Invalid coupon type", 400);
    }

    const couponExists = await Coupon.exists({ couponCode: couponCode.toUpperCase(), isDeleted: false });
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

        if (!couponCode || !couponType || !couponValue || !minAmount || !expiry || !count || !couponId) {
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
        const deletedCoupon = await Coupon.findByIdAndUpdate(
            req.query.couponId,
            { $set: { isDeleted: true, isActive: false } },
            { new: true }
        );

        if (deletedCoupon) {
            response.success(res, {}, "You have successfully deleted the coupon.");
        } else {
            response.error(res, "Coupon ID was not found.", 400);
        }

    } catch (err) {
        response.serverError(res, err);
    }
};

const changeCouponStatus = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');

    try {
        const { couponId } = req.body;

        if (!couponId) {
            return response.error(res, "Coupon ID is required.", 400);
        }

        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return response.error(res, "Coupon not found.", 404);
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        const status = coupon.isActive ? 'active' : 'inactive';
        return response.success(res, {}, `Coupon is now ${status}.`);

    } catch (err) {
        response.serverError(res, err);
    }
};

module.exports = {
    renderCouponPage,
    createCoupons,
    updateCoupons,
    deleteCoupons,
    changeCouponStatus
};

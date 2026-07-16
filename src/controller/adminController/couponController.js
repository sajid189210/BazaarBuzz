const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const Coupon = require('../../model/couponModel');

const renderCouponPage = async (req, res) => {
    try {
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
    const { couponCode, couponType, couponValue, minAmount, expiry, count } = req.body;

    if (!couponCode || !couponType || !couponValue || !minAmount || !expiry || !count) {
        return response.error(res, MSG.COUPON_ALL_FIELDS_REQUIRED, 400);
    }

    if (!['price', 'percentage'].includes(couponType)) {
        return response.error(res, MSG.COUPON_INVALID_TYPE, 400);
    }

    const couponExists = await Coupon.exists({ couponCode: couponCode.toUpperCase(), isDeleted: false });
    if (couponExists) {
        return response.error(res, MSG.COUPON_EXISTS, 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(expiry);
    expiryDate.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
        return response.error(res, MSG.COUPON_EXPIRY_FUTURE, 400);
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
        return response.success(res, {}, MSG.COUPON_CREATED, 201);
    } catch (err) {
        response.serverError(res, err);
    }
};

const updateCoupons = async (req, res) => {
    try {
        const { couponCode, couponType, couponValue, minAmount, expiry, count, couponId } = req.body;

        if (!couponCode || !couponType || !couponValue || !minAmount || !expiry || !count || !couponId) {
            return response.error(res, MSG.COUPON_ALL_FIELDS_REQUIRED, 400);
        }

        const coupon = await Coupon.findOne({ _id: couponId, isDeleted: false });

        if (!coupon) {
            return response.error(res, MSG.COUPON_NOT_FOUND, 404);
        }

        coupon.couponCode = couponCode;
        coupon.couponType = couponType;
        coupon.couponValue = couponValue;
        coupon.minAmount = minAmount;
        coupon.expiry = expiry;
        coupon.count = count;

        await coupon.save();

        return response.success(res, {}, MSG.COUPON_UPDATED);

    } catch (err) {
        response.serverError(res, err);
    }
};

const deleteCoupons = async (req, res) => {
    try {
        const deletedCoupon = await Coupon.findByIdAndUpdate(
            req.query.couponId,
            { $set: { isDeleted: true, isActive: false } },
            { new: true }
        );

        if (deletedCoupon) {
            response.success(res, {}, MSG.COUPON_DELETED);
        } else {
            response.error(res, MSG.COUPON_ID_NOT_FOUND, 400);
        }

    } catch (err) {
        response.serverError(res, err);
    }
};

const changeCouponStatus = async (req, res) => {
    try {
        const { couponId } = req.body;

        if (!couponId) {
            return response.error(res, MSG.COUPON_ID_REQUIRED, 400);
        }

        const coupon = await Coupon.findOne({ _id: couponId, isDeleted: false });

        if (!coupon) {
            return response.error(res, MSG.COUPON_NOT_FOUND, 404);
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        const status = coupon.isActive ? 'active' : 'inactive';
        return response.success(res, {}, MSG.COUPON_STATUS(status));

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

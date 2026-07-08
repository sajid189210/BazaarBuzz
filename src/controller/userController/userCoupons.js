const response = require('../../Services/responseMapper');
const Coupon = require('../../model/couponModel');
const User = require('../../model/userModel');
const Category = require('../../model/categoryModel');


const renderCoupons = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');
    const userId = req.session.user.userId;

    try {
        const [coupons, userDetails, categories] = await Promise.all([
            Coupon.find(),
            User.findById(userId),
            Category.find({ isActive: { $ne: false } }),
        ]);

        if (!coupons || !userDetails) {
            throw new Error("Coupons or user details not found");
        }

        res.render('user/userCoupons', {
            title: 'My Coupons',
            user: req.session.user || null,
            userDetails,
            searchBox: false,
            coupons,
            categories,
        });

    } catch (err) {
        response.serverError(res, err);
    }
}

module.exports = {
    renderCoupons,
}


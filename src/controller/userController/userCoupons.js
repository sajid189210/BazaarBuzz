const response = require('../../Services/responseMapper');
const Coupon = require('../../model/couponModel');
const User = require('../../model/userModel');


const renderCoupons = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');
    const userId = req.session.user.userId;

    try {
        const [coupons, userDetails] = await Promise.all([
            Coupon.find(),
            User.findById(userId)
        ]);

        if (!coupons || !userDetails) {
            throw new Error("Coupons or user details not found");
        }

        res.render('user/userCoupons', {
            user: req.session.user || null,
            userDetails,
            searchBox: false,
            coupons
        });

    } catch (err) {
        response.serverError(res, err);
    }
}

module.exports = {
    renderCoupons,
}


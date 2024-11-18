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
        console.error(`Error caught verifyPayment in the checkoutController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
}

module.exports = {
    renderCoupons,
}


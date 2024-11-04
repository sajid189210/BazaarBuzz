const Category = require('../../model/categoryModel');
const User = require('../../model/userModel');

const renderProfile = async () => {
    try {

        if (!req.session.user) return res.redirect('user/signIn');

        const userId = req.session.user.userId;

        const user = await User.findById(userId);

        const category = await Category.find();

        res.render('user/userProfile', {
            user,
            category
        });

    } catch (err) {
        console.error(`Error caught getOrders in the cartController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


module.exports = {
    renderProfile,
}
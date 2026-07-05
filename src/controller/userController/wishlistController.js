const response = require('../../Services/responseMapper');
const Wishlist = require('../../model/wishlistModel');
const User = require('../../model/userModel');
const Product = require('../../model/productModel');
const Category = require('../../model/categoryModel');


const renderWishlist = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;

        const [user, wishlist, categories] = await Promise.all([
            User.findById(userId),
            Wishlist.findOne({ user: userId }).populate('items.product'),
            Category.find({ isActive: { $ne: false } }),
        ]);

        if (!user) throw new Error('Could not find the user or the wishlist.');

        if (!wishlist) {
            const newWishlist = new Wishlist({ user: userId });
            await newWishlist.save();
            return res.render('user/userWishlist', {
                searchBox: false,
                wishlist: newWishlist,
                user: req.session.user || null,
                categories,
            });
        }

        res.render('user/userWishlist', {
            searchBox: false,
            wishlist,
            user: req.session.user || null,
            categories,
        });

    } catch (err) {
        response.serverError(res, err);}
};

const addToWishList = async (req, res) => {
    try {
        if (!req.session.user) return response.error(res, "Please Sign In to view the cart.", 400, { session: false,
            redirectUrl: '/user/signIn'
        });

        const userId = req.session.user.userId;
        const { productId } = req.body;
        const wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) return response.error(res, "Could not find the wishlist.", 404, { session: true });

        const existingItem = wishlist.items.find(item => item.product.toString() === productId);

        if (existingItem) return response.error(res, "Product already exists in the wishlist.", 409, { session: true, redirectUrl: "/user/wishlist" });

        wishlist.items.push({ product: productId });
        await wishlist.save();

        response.success(res, {
            session: true,
            success: true,
            message: 'Product Successfully Added.'
        });

    } catch (err) {
        response.serverError(res, err);}
}

const removeProduct = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');
    const userId = req.session.user.userId;
    const { productId } = req.body;

    try {
        if (!productId) throw new Error("Could not find the product.");

        const wishlist = await Wishlist.findOne({ user: userId });

        const index = wishlist.items.findIndex(item => item.product.toString() === productId);

        // Remove the product from the wishlist
        const result = await Wishlist.updateOne(
            { user: userId },
            { $pull: { items: { product: productId } } }
        );

        // Checking if a product was removed
        if (result.modifiedCount === 0) {
            return response.error(res, "Product not found in the wishlist.", 404);
        }

        response.success(res, {}, "Product successfully removed from the wishlist.");

    } catch (err) {
        response.serverError(res, err);}
}

module.exports = {
    renderWishlist,
    addToWishList,
    removeProduct,
}
const Wishlist = require('../../model/wishlistModel');
const User = require('../../model/userModel');
const Product = require('../../model/productModel');


const renderWishlist = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;

        const [user, wishlist] = await Promise.all([
            User.findById(userId),
            Wishlist.findOne({ user: userId }).populate('items.product')
        ]);

        if (!user) throw new Error('Could not find the user or the wishlist.');

        if (!wishlist) {
            await new Wishlist({ user: userId }).save();
        }

        res.render('user/userWishlist', {
            user: req.session.user || null,
            wishlist
        });

    } catch (err) {
        console.error(`Error caught renderWishlist in the wishlistController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const addToWishList = async (req, res) => {
    try {
        if (!req.session.user) return res.status(400).json({
            session: false,
            success: false,
            message: "Please Sign In to view the cart.",
            redirectUrl: '/user/signIn'
        });

        const userId = req.session.user.userId;
        const { productId } = req.body;
        const wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) return res.status(404).json({
            session: true,
            success: false,
            message: 'Could not find the wishlist.'
        });

        const existingItem = wishlist.items.find(item => item.product.toString() === productId);

        if (existingItem) return res.status(409).json({
            session: true,
            success: false,
            message: 'Product already exists in the wishlist.',
            redirectUrl: '/user/wishlist'
        });

        wishlist.items.push({ product: productId });
        await wishlist.save();

        res.status(200).json({
            session: true,
            success: true,
            message: 'Product Successfully Added.'
        });

    } catch (err) {
        console.error(`Error caught viewProduct in the productViewController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
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
            return res.status(404).json({
                success: false,
                message: 'Product not found in the wishlist.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product successfully removed from the wishlist.'
        });

    } catch (err) {
        console.error(`Error caught removeProduct in the wishlistController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
}

module.exports = {
    renderWishlist,
    addToWishList,
    removeProduct,
}
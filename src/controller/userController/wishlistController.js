const R = require('../../constants/redirects');
const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const Wishlist = require('../../model/wishlistModel');
const User = require('../../model/userModel');
const Category = require('../../model/categoryModel');
const Offer = require('../../model/offerModel');


const renderWishlist = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect(R.USER_SIGNIN);

        const userId = req.session.user.userId;

        const [user, wishlist, categories] = await Promise.all([
            User.findById(userId),
            Wishlist.findOne({ user: userId }).populate('items.product'),
            Category.find({ isActive: { $ne: false } }),
        ]);

        if (!user) throw new Error(MSG.WISHLIST_USER_NOT_FOUND);

        if (!wishlist) {
            const newWishlist = new Wishlist({ user: userId });
            await newWishlist.save();
            return res.render('user/userWishlist', {
                title: 'My Wishlist',
                searchBox: false,
                wishlist: newWishlist,
                user: req.session.user || null,
                categories,
            });
        }

        const offers = await Offer.find({ isActive: true });
        const catMap = {};
        categories.forEach(c => { catMap[c.name?.toLowerCase()] = c._id; });

        const enrichedItems = wishlist.items.map(item => {
            const product = item.product.toObject ? item.product.toObject() : item.product;
            const catId = catMap[product.category?.toLowerCase()];
            const offer = offers.find(o =>
                o.brandName === product.brand &&
                (!catId || o.category.toString() === catId.toString())
            ) || null;
            return { product, offer };
        });

        const wishlistData = {
            _id: wishlist._id,
            user: wishlist.user,
            items: enrichedItems,
            createdAt: wishlist.createdAt,
            updatedAt: wishlist.updatedAt
        };

        res.render('user/userWishlist', {
            title: 'My Wishlist',
            searchBox: false,
            wishlist: wishlistData,
            user: req.session.user || null,
            categories,
        });

    } catch (err) {
        response.serverError(res, err);}
};

const addToWishList = async (req, res) => {
    try {
        if (!req.session.user) return response.error(res, MSG.WISHLIST_AUTH_REQUIRED, 400, { session: false,
            redirectUrl: R.USER_SIGNIN
        });

        const userId = req.session.user.userId;
        const { productId } = req.body;

        let wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, items: [] });
        }

        const exists = wishlist.items.some(item => item.product.toString() === productId);

        if (exists) {
            wishlist.items.pull({ product: productId });
            await wishlist.save();
            return response.success(res, {
                session: true,
                action: 'removed',
                message: MSG.WISHLIST_REMOVED
            });
        }

        wishlist.items.push({ product: productId });
        await wishlist.save();

        response.success(res, {
            session: true,
            action: 'added',
            message: MSG.WISHLIST_ADDED
        });

    } catch (err) {
        response.serverError(res, err);}
}

const getWishlistCount = async (req, res) => {
    try {
        if (!req.session.user) return res.json({ count: 0 });
        const wishlist = await Wishlist.findOne({ user: req.session.user.userId });
        res.json({ count: wishlist ? wishlist.items.length : 0 });
    } catch (err) {
        res.json({ count: 0 });
    }
};

const removeProduct = async (req, res) => {
    if (!req.session.user) return res.redirect(R.USER_SIGNIN);
    const userId = req.session.user.userId;
    const { productId } = req.body;

    try {
        if (!productId) throw new Error(MSG.WISHLIST_PRODUCT_ID_MISSING);

        // Remove the product from the wishlist
        const result = await Wishlist.updateOne(
            { user: userId },
            { $pull: { items: { product: productId } } }
        );

        // Checking if a product was removed
        if (result.modifiedCount === 0) {
            return response.error(res, MSG.WISHLIST_PRODUCT_NOT_FOUND, 404);
        }

        response.success(res, {}, MSG.WISHLIST_REMOVED);

    } catch (err) {
        response.serverError(res, err);}
}

module.exports = {
    renderWishlist,
    addToWishList,
    removeProduct,
    getWishlistCount,
}
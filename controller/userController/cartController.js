const Cart = require('../../model/userCartModel');
const Category = require('../../model/categoryModel');
const Products = require('../../model/productModel');


//* shows the cart items.
const getCart = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');

        const categories = await Category.find({ isActive: true });

        if (!categories) throw new Error("Categories not found");

        const userId = req.session.user.userId

        const cart = await Cart.findOne({ user: userId }).populate('items.product')

        res.render('user/userCart', {
            user: req.session.user || null,
            categories,
            cart,
        });

    } catch (err) {
        console.error(`Error caught getCart in the cartController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

//* Adds items to the cart
const addToCart = async (req, res) => {
    const { productId, color } = req.body;

    try {
        if (!req.session.user) return res.json({
            session: false,
            success: false,
            message: "Please Sign In to view the cart.",
            redirectUrl: '/user/signIn'
        });

        const userId = req.session.user.userId;

        if (!productId) throw new Error("Product Id Missing");

        const product = await Products.findById(productId).exec();

        let cart = await Cart.findOne({ user: userId }).exec();

        if (cart.items.length === 5) {
            return res.status(400).json({
                session: true,
                success: 'full',
                message: `Your cart is full! You can only have 5 items. Please empty your cart by removing items or proceeding to checkout.`,
                redirectUrl: '/user/cart'
            });
        }

        if (!cart) {
            cart = new Cart({ user: userId });
            await cart.save();
        }
        // checking if the product already exists in the cart.
        const existingItem = cart.items.find(item => item.product.toString() === productId);

        if (existingItem) {
            if (color) {
                await Cart.updateOne(
                    { user: userId, 'items.product': productId },
                    { $set: { 'items.$.selectedColor': color } },
                    { new: true }
                );
            }
            return res.status(200).json({
                session: true,
                success: true,
                message: "Product already added to cart.",
                redirectUrl: '/user/cart'
            });
        }

        let discountedPrice = Math.round(product.productPrice * (1 - (parseFloat(product.discount) / 100)));

        // Adding products if it isn't already exists.
        cart.items.push({ product: productId, discountedPrice, selectedColor: color });
        cart.save();

        return res.status(400).json({
            session: true,
            success: true,
            message: "Product successfully added in the cart.",
            redirectUrl: '/user/cart'
        });

    } catch (err) {
        console.error(`Error caught addToCart in the cartController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

//* Remove items from the cart.
const removeItem = async (req, res) => {
    const { itemId } = req.body;
    const userId = req.session.user.userId
    try {
        if (!itemId) return res.status(400).json({
            succuss: false,
            message: 'Item ID or User ID is not found.'
        });

        const result = await Cart.updateOne(
            { user: userId },
            { $pull: { items: { _id: itemId } } }
        ).exec();

        if (result.modifiedCount === 0) throw new Error("Item not found or already removed from the user\'s cart");

        res.status(200).json({
            success: true,
            message: 'Item successfully removed from the cart.'
        });

    } catch (err) {
        console.error(`Error caught removeItem in the cartController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

//* Quantity updates
const updateQuantity = async (req, res) => {
    const { quantity, itemId } = req.body;
    const userId = req.session.user.userId;

    //? typeof process === 'boolean'
    //? process ? increase : decrease;
    const { process } = req.body;

    try {

        if (!quantity || typeof quantity !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'Invalid quantity: it must be a valid number.'
            });
        }

        if (process) {
            const result = await Cart.findOneAndUpdate(
                { user: userId, 'items._id': itemId },
                { $set: { 'items.$.quantity': quantity + 1 } },
                { new: true }
            );
            if (result) {
                const product = await Products.findById(result.items.product)
                await Products.findOneAndUpdate(
                    { _id: product._id },
                    { $set: { stock: product.stock - 1 } },
                    { new: true }
                )
            } else {
                throw new Error("Error quantity++")
            }

        } else {
            const result = await Cart.findOneAndUpdate(
                { user: userId, 'items._id': itemId },
                { $set: { 'items.$.quantity': quantity - 1 } },
                { new: true }
            );

            if (result) {
                const product = await Products.findById(result.items.product)
                await Products.findOneAndUpdate(
                    { _id: result.items.product },
                    { $set: { stock: product.stock + 1 } },
                    { new: true }
                )
            }
        }

        res.status(200).json({
            success: true,
        });


    } catch (err) {
        console.error(`Error caught updateQuantity in the cartController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

module.exports = {
    updateQuantity,
    removeItem,
    addToCart,
    getCart,
}
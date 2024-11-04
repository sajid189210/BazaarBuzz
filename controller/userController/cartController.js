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
    const { productId, color, size, stock } = req.body;

    try {
        if (!req.session.user) return res.status(400).json({
            session: false,
            success: false,
            message: "Please Sign In to view the cart.",
            redirectUrl: '/user/signIn'
        });

        if (!productId || !color || !size || !stock) {
            return res.status(400).json({
                session: true,
                success: false,
                message: "Product or color or size or stock is missing.",
            });
        }

        const userId = req.session.user.userId;

        const product = await Products.findById(productId).exec();

        let cart = await Cart.findOne({ user: userId, }).exec();

        if (cart && cart.items.length === 5) {
            return res.status(400).json({
                session: true,
                success: false,
                message: `You have reached your cart limit. Please empty your cart by removing items or by proceeding to checkout.`,
            });
        }

        if (!cart) {
            cart = new Cart({ user: userId });
            await cart.save();
        }

        // checking if the product already exists in the cart.
        const existingItem = cart.items.find(item => item.product.toString() === productId);

        if (existingItem) {
            if (color && size) {
                await Cart.updateOne(
                    { user: userId, 'items.product': productId },
                    {
                        $set: {
                            'items.$.selectedColor': color,
                            'items.$.selectedSize': size,
                            'items.$.selectedStock': stock
                        }
                    },
                    { new: true }
                );
            }
            return res.status(200).json({
                session: true,
                success: true,
                message: "Product was already added to cart.",
                redirectUrl: '/user/cart'
            });
        }

        let discountedPrice = Math.round(product.productPrice * (1 - (parseFloat(product.discount) / 100)));

        // Adding products if it isn't already exists.
        try {
            cart.items.push({
                product: productId,
                selectedColor: color,
                selectedSize: size,
                selectedStock: stock,
                discountedPrice,
            });
            await cart.save();
        } catch (err) {
            throw new Error("Error while saving product in the cart", err)
        }

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

        if (result.modifiedCount === 0) throw new Error("Item not found or already removed from the user's cart");

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
    const { itemId, process } = req.body;

    if (!req.session.user) return res.redirect('/user/signIn');

    const userId = req.session.user.userId;

    try {

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'You have not signed In!'
            });
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found.'
            });
        }

        const item = cart.items.find(item => item._id.toString() === itemId);

        const variant = item.product.variants.find(variant => variant.size === item.selectedSize);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart.'
            });
        }

        if (process) {

            if (variant.stock <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Out of stock.'
                });
            }

            if (item.quantity >= 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum quantity reached.'
                });
            }
            item.quantity += 1;
            item.discountedPrice = (item.product.productPrice - (item.product.productPrice * (item.product.discount / 100))) * item.quantity
        } else {

            if (item.quantity <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Quantity cannot be less than 1.'
                });
            }
            item.quantity -= 1;
            item.discountedPrice = (item.product.productPrice - (item.product.productPrice * (item.product.discount / 100))) * item.quantity
        }

        // Save changes to the cart
        await cart.save();

        // data for the price summary.
        let totalOriginalPrice = 0;
        let totalDiscountedPrice = 0;

        cart.items.forEach(item => {
            totalOriginalPrice += item.product.productPrice * item.quantity;
            totalDiscountedPrice += item.discountedPrice;
        })

        return res.status(200).json({
            success: true,
            discountedPrice: item.discountedPrice,
            totalOriginalPrice,
            totalDiscountedPrice
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
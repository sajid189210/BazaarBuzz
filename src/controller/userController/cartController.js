const response = require('../../Services/responseMapper');
const Cart = require('../../model/userCartModel');
const Category = require('../../model/categoryModel');
const Products = require('../../model/productModel');
const Offer = require('../../model/offerModel');


//* shows the cart items.
const getCart = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');
        const userId = req.session.user.userId;

        const categories = await Category.find({ isActive: true });
        if (!categories) throw new Error("Categories not found");

        const cart = await Cart.findOne({ user: userId }).populate('items.product').populate('items.offer');
        const offers = await Offer.find({ isActive: true });

        if (!cart) {
            const newCart = Cart({ user: userId });
            await newCart.save();
            return res.render('user/userCart', {
                user: req.session.user || null,
                cart,
            });
        }

        // updates the cart items only to contain inStock product
        cart.items = cart.items.filter(item => {
            const variant = item.product.variants.find(variant => variant.size === item.selectedSize);
            return variant && variant.stock > 0;
        });

        await cart.save();

        const totalPrice = cart.items.reduce((acc, item) => acc + (item.product.productPrice * item.quantity), 0);
        const totalDiscount = cart.items.reduce((acc, item) => acc + ((item.product.productPrice * item.product.discount) / 100), 0);

        const totalOfferDiscountValue = cart.items.reduce((acc, item) => {
            if (item.offer) {
                return acc + (item.product.productPrice * ((100 - item.product.discount) / 100) * (item.offer.discount / 100));
            }
            return acc;
        }, 0);

        const total = totalPrice - (totalDiscount + totalOfferDiscountValue);
        const tax = Math.round((total * 5) / 100);

        res.render('user/userCart', {
            totalOfferDiscountValue,
            totalDiscount,
            totalPrice,
            categories,
            searchBox: false,
            offers,
            total,
            cart,
            user: req.session.user || null,
            tax,
        });

    } catch (err) {
        response.serverError(res, err);}
};

//* Adds items to the cart
const addToCart = async (req, res) => {
    const { productId, color, size, stock } = req.body;

    try {
        if (!req.session.user) return response.error(res, "Please Sign In to view the cart.", 400, { session: false,
            redirectUrl: '/user/signIn'
        });

        if (!productId || !color || !size || !stock) {
            return response.error(res, "Product or color or size or stock is missing.", 400, { session: true,
            });
        }

        const userId = req.session.user.userId;

        const product = await Products.findById(productId).exec();
        const offers = await Offer.find({ isActive: true }).exec();
        let cart = await Cart.findOne({ user: userId, }).exec();

        let offer;
        const index = offers.findIndex(offer => offer.brandName === product.brand);
        if (index !== -1) {
            offer = offers[index];
        }


        if (cart && cart.items.length === 5) {
            return response.error(res, 'You have reached your cart limit. Please empty your cart by removing items or by proceeding to checkout.', 400, { session: true });
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
            return response.success(res, {
                session: true,
                success: true,
                message: "Product was already added to cart.",
                redirectUrl: '/user/cart'
            });
        }

        let productPriceAfterProductDiscount = product.productPrice - ((product.productPrice * product.discount) / 100);

        if (offer) {
            productPriceAfterProductDiscount = productPriceAfterProductDiscount - ((productPriceAfterProductDiscount * offer.discount) / 100);
        }

        // Adding products if it isn't already exists.
        try {
            cart.items.push({
                product: productId,
                selectedColor: color,
                selectedSize: size,
                selectedStock: stock,
                discountedPrice: productPriceAfterProductDiscount.toFixed(2),
                offer: offer?._id || null
            });
            await cart.save();
        } catch (err) {
            throw new Error("Error while saving product in the cart", err)
        }

        return response.success(res, {
            session: true,
            success: true,
            message: "Product successfully added in the cart.",
            redirectUrl: '/user/cart'
        });

    } catch (err) {
        response.serverError(res, err);}
};

//* Remove items from the cart.
const removeItem = async (req, res) => {
    const { itemId } = req.body;
    const userId = req.session.user.userId
    try {
        if (!itemId) return response.error(res, 'Item ID or User ID is not found.', 400);

        const result = await Cart.updateOne(
            { user: userId },
            { $pull: { items: { _id: itemId } } }
        ).exec();

        if (result.modifiedCount === 0) throw new Error("Item not found or already removed from the user's cart");

        response.success(res, {}, "Item successfully removed from the cart.");

    } catch (err) {
        response.serverError(res, err);}
};

//* Quantity updates
const updateQuantity = async (req, res) => {
    const { itemId, process } = req.body;

    if (!req.session.user) return res.redirect('/user/signIn');

    const userId = req.session.user.userId;

    try {

        if (!userId) {
            return response.error(res, "You have not signed In!", 400);
        }

        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart) {
            return response.error(res, "Cart not found.", 404);
        }

        const item = cart.items.find(item => item._id.toString() === itemId);

        const variant = item.product.variants.find(variant => variant.size === item.selectedSize);

        if (!item) {
            return response.error(res, "Item not found in cart.", 404);
        }

        if (process) {

            if (variant.stock <= 1) {
                return response.error(res, "Out of stock.", 400);
            }

            if (item.quantity >= 5) {
                return response.error(res, "Maximum quantity reached.", 400);
            }
            item.quantity += 1;
            item.discountedPrice = ((item.product.productPrice - (item.product.productPrice * (item.product.discount / 100))) * item.quantity).toFixed(2);
        } else {

            if (item.quantity <= 1) {
                return response.error(res, "Quantity cannot be less than 1.", 400);
            }
            item.quantity -= 1;
            item.discountedPrice = ((item.product.productPrice - (item.product.productPrice * (item.product.discount / 100))) * item.quantity).toFixed(2)
        }

        // Save changes to the cart
        await cart.save();

        // data for the price summary.
        let totalOriginalPrice = 0;
        let totalDiscountedPrice = 0;

        cart.items.forEach(item => {
            totalOriginalPrice += (item.product.productPrice * item.quantity);
            totalDiscountedPrice += item.discountedPrice;
        })

        return response.success(res, {
            success: true,
            discountedPrice: item.discountedPrice,
            totalOriginalPrice,
            totalDiscountedPrice,
            quantity: item.quantity,
        });

    } catch (err) {
        response.serverError(res, err);}
};

module.exports = {
    updateQuantity,
    removeItem,
    addToCart,
    getCart,
}
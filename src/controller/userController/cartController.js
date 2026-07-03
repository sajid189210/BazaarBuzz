const response = require('../../Services/responseMapper');
const Cart = require('../../model/userCartModel');
const Category = require('../../model/categoryModel');
const Products = require('../../model/productModel');
const Offer = require('../../model/offerModel');


const round = (value) => {
    return Math.trunc(value * 100) / 100;
}

// * shows the cart items.
const getCart = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');
        const userId = req.session.user.userId;

        const [categories, cart, offers] = await Promise.all([
            Category.find({ isActive: true }),
            Cart.findOne({ user: userId }).populate('items.product').populate('items.offer'),
            Offer.find({ isActive: true })
        ]);

        if (!cart) {
            return res.redirect('/user/userHomepage');
        }

        const originalLength = cart.items.length;

        cart.items = cart.items.filter(item => {
            if (!item.product) return false;

            const variant = item.product.variants.find(
                variant => variant.size === item.selectedSize
            );

            return variant && variant.stock > 0;
        });

        if (cart.items.length !== originalLength) {
            await cart.save();
        }

        const productPriceBreakUpMap = {};

        for (const item of cart.items) {
            const finalPrice = item.discountedPrice;
            const productDiscount = item.product?.discount ?? 0;
            const offerDiscount = item?.offer?.discount ?? 0;
            const productPrice = item.product.productPrice;
            const quantity = item.quantity;

            const productPriceBreakUp = {
                finalPrice: finalPrice * quantity,
                productDiscount,
                offerDiscount,
                productPrice: productPrice * quantity,
            }

            productPriceBreakUpMap[item._id] = productPriceBreakUp;
        }

        let subTotal = 0;
        let total = 0;
        for (let itemId in productPriceBreakUpMap) {
            subTotal += productPriceBreakUpMap[itemId].productPrice;
            total += productPriceBreakUpMap[itemId].finalPrice;
        }

        const totalDiscount = subTotal - total;
        const taxAmount = total * .05;
        total += taxAmount;

        res.render('user/userCart', {
            categories,
            searchBox: false,
            cart,
            offers,
            user: req.session.user || null,
            total: round(total),
            subTotal: round(subTotal),
            taxAmount: round(taxAmount),
            totalDiscount: round(totalDiscount),
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

//* Adds items to the cart
const addToCart = async (req, res) => {
    if (!req.session.user) return response.error(res, "Please Sign In to view the cart.", 400, {
        session: false,
        redirectUrl: '/user/signIn'
    });

    const { productId, color, size } = req.body;
    const userId = req.session.user.userId;

    if (!productId || !color || !size) {
        return response.error(res, "Product details are missing.", 400, {
            session: true,
        });
    }

    try {
        const [product, offers] = await Promise.all([
            Products.findById(productId),
            Offer.find({ isActive: true }),
        ]);

        if (!product) {
            return response.error(res, "Product not found.", 404);
        }

        const selectedVariant = product.variants.find(v => v.size === size);

        if (!selectedVariant) {
            return response.error(res, "Selected variant not found.", 404);
        }

        if (selectedVariant.stock <= 0) {
            return response.error(res, "Product is out of stock.", 400);
        }

        let cart = await Cart.findOne({ user: userId, });

        if (!cart) {
            cart = new Cart({ user: userId });
        }

        const isSameItemExists = cart.items.some(item =>
            item.product.toString() === productId &&
            item.selectedColor === color &&
            item.selectedSize === size
        );

        if (isSameItemExists) {
            return response.error(res, "Item already exist in the cart", 400);
        }

        let offer = null;

        const matchedOffer = offers.find(offer => offer.brandName === product.brand);

        if (matchedOffer) {
            offer = matchedOffer;
        }

        const productPrice = product.productPrice;
        const productDiscount = product.discount;

        const discountedAmount = productPrice - ((productPrice * productDiscount) / 100);

        const absoluteMinPrice = productPrice * 0.10;

        let finalPrice = Math.max(discountedAmount, absoluteMinPrice);

        if (offer?.discount > 0) {
            const offerPrice =
                discountedAmount -
                ((discountedAmount * offer.discount) / 100);

            finalPrice = Math.max(offerPrice, absoluteMinPrice);
        }

        cart.items.push({
            product: product._id,
            quantity: 1,
            selectedColor: color,
            selectedSize: size,
            selectedStock: selectedVariant.stock,
            discountedPrice: round(finalPrice),
            offer: offer?._id || null
        });

        await cart.save();


        return response.success(res, {
            session: true,
            success: true,
            message: "Product successfully added in the cart.",
            redirectUrl: '/user/cart'
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

//* Remove items from the cart.
const removeItem = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');

    const { itemId } = req.body;
    const userId = req.session.user.userId;

    try {
        if (!itemId) return response.error(res, 'Item ID or User ID is not found.', 400);

        const result = await Cart.updateOne(
            { user: userId },
            { $pull: { items: { _id: itemId } } }
        ).exec();

        if (result.modifiedCount === 0) throw new Error("Item not found or already removed from the user's cart");

        response.success(res, {}, "Item successfully removed from the cart.");

    } catch (err) {
        response.serverError(res, err);
    }
};

//* Quantity updates
const updateQuantity = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');

    const { itemId, process } = req.body;
    const userId = req.session.user.userId;

    if (!itemId || typeof process !== 'boolean') {
        return response.error(res, "Invalid request.", 400);
    }

    try {
        const cart = await Cart.findOne({ user: userId }).populate('items.product');

        if (!cart) {
            return response.error(res, "Cart not found.", 404);
        }

        const item = cart.items.find(item => item._id.toString() === itemId);

        if (!item) {
            return response.error(res, "Cart item not found.", 404);
        }

        const variant = item.product.variants.find(
            variant => variant.size === item.selectedSize
        );

        if (!variant) {
            return response.error(res, "Variant not found.", 404);
        }

        if (process) {

            // Maximum quantity allowed in cart
            if (item.quantity >= 5) {
                return response.error(
                    res,
                    "Maximum 5 quantities are allowed.",
                    400
                );
            }

            // Available stock check
            if (item.quantity >= variant.stock) {
                return response.error(
                    res,
                    "Only " + variant.stock + " item(s) available in stock.",
                    400
                );
            }

            item.quantity++;

        } else {

            // Minimum quantity
            if (item.quantity === 1) {
                return response.error(
                    res,
                    "Quantity cannot be less than 1.",
                    400
                );
            }

            item.quantity--;
        }

        // Save changes to the cart
        await cart.save();

        return response.success(res, {
            success: true,
            message: "Quantity updated successfully.",
            quantity: item.quantity,
            discountedPrice: round(item.discountedPrice * item.quantity),
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

module.exports = {
    updateQuantity,
    removeItem,
    addToCart,
    getCart,
}
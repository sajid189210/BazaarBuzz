const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const Product = require('../../model/productModel');
const Category = require('../../model/categoryModel');
const Offer = require('../../model/offerModel');
const Wishlist = require('../../model/wishlistModel');

const viewProduct = async (req, res) => {
    try {
        const { productId } = req.query;
        const product = await Product.findOne({ _id: productId, isActive: true, isDeleted: false });

        if (!product) {
            return res.render('user/userProductView', {
                title: MSG.PRODUCT_NOT_FOUND,
                product: null,
                categories: await Category.find(),
                searchBox: true,
                user: req.session.user || null,
            });
        }

        const offers = await Offer.find({ isActive: true });
        const categories = await Category.find();
        const catMap = {};
        categories.forEach(c => { catMap[c.title] = c._id; });

        const offerIndex = offers.findIndex(offer => 
            offer.brandName === product.brand && 
            offer.category.toString() === catMap[product.category]?.toString()
        );

        const priceFloor = product.productPrice * 0.10;
        const productDiscountedPrice = Math.max(product.productPrice - ((product.productPrice * product.discount) / 100), priceFloor);

        let offerDiscountedPrice = productDiscountedPrice;
        let totalDiscount = product.discount;
        let offerDiscountValue;
        if (offerIndex !== -1) {
            offerDiscountValue = offers[offerIndex].discount;
            offerDiscountedPrice = Math.max(productDiscountedPrice - ((productDiscountedPrice * offerDiscountValue) / 100), priceFloor);
            totalDiscount = Math.min(100, 100 - ((offerDiscountedPrice * 100) / product.productPrice));
        }

        // Process variants - extract unique sizes and colors
        const uniqueSizes = [...new Set(product.variants.map(v => v.size).filter(Boolean))];
        const allColors = [...new Set(product.variants.flatMap(v => v.colors || []).filter(Boolean))];

        // Create size-color mapping for stock awareness
        const sizeColorStock = {};
        const firstColorPerSize = {};
        const stockPerSize = {}; // first color's stock per size for initial display
        product.variants.forEach(variant => {
            if (!sizeColorStock[variant.size]) {
                sizeColorStock[variant.size] = {};
                firstColorPerSize[variant.size] = variant.colors[0];
            }
            variant.colors.forEach(color => {
                sizeColorStock[variant.size][color] = variant.stock;
            });
            // Use first color's stock for size-level display
            if (variant.colors[0] && stockPerSize[variant.size] === undefined) {
                stockPerSize[variant.size] = variant.stock;
            }
        });

        // Pre-compute size data for template needs for template
        const sizeData = uniqueSizes.map(size => ({
            size,
            firstColor: firstColorPerSize[size],
            stock: stockPerSize[size] || 0,
            isOutOfStock: (stockPerSize[size] || 0) <= 0,
            isLowStock: (stockPerSize[size] || 0) > 0 && (stockPerSize[size] || 0) <= 5
        }));

        // Check wishlist status if user is logged in
        let isInWishlist = false;
        if (req.session.user) {
            const wishlist = await Wishlist.findOne({ user: req.session.user.userId });
            if (wishlist && wishlist.items) {
                isInWishlist = wishlist.items.some(item => item.product.toString() === productId);
            }
        }

        // Get recently viewed products from session
        let recentlyViewed = req.session.recentlyViewed || [];
        recentlyViewed = recentlyViewed.filter(id => id.toString() !== productId);
        recentlyViewed.unshift(productId);
        if (recentlyViewed.length > 10) recentlyViewed.pop();
        req.session.recentlyViewed = recentlyViewed;

        const recentlyViewedProducts = await Product.find({
            _id: { $in: recentlyViewed.slice(1, 6) },
            isActive: true,
            isDeleted: false
        }).select('productName productPrice discount images brand').lean();

        // Get related products (same category/brand, excluding current)
        const relatedProducts = await Product.find({
            _id: { $ne: productId },
            $or: [
                { category: product.category },
                { brand: product.brand }
            ],
            isActive: true,
            isDeleted: false
        })
            .select('productName productPrice discount images brand')
            .limit(8)
            .lean();

        // Calculate price for related products
        const processProductPrice = (p) => {
            const floor = p.productPrice * 0.10;
            const discPrice = p.discount ? Math.max(Math.round(p.productPrice - (p.productPrice * p.discount / 100)), floor) : p.productPrice;
            const matchedOffer = offers.find(o =>
                o.brandName === p.brand &&
                o.category.toString() === catMap[p.category]?.toString()
            );
            let finalPrice = discPrice;
            if (matchedOffer && matchedOffer.discount > 0) {
                finalPrice = Math.max(Math.round(discPrice - (discPrice * matchedOffer.discount / 100)), floor);
            }
            return { ...p, finalPrice, discPrice, hasOffer: !!matchedOffer, offerName: matchedOffer?.offerName, offerDiscount: matchedOffer?.discount };
        };

        res.render('user/userProductView', {
            title: 'Product Details',
            offerDiscountedPrice: offerDiscountedPrice.toFixed(2),
            offerDiscountValue,
            totalDiscount,
            categories,
            searchBox: true,
            product,
            user: req.session.user || null,
            uniqueSizes,
            allColors,
            sizeColorStock: JSON.stringify(sizeColorStock),
            sizeData,
            isInWishlist,
            recentlyViewedProducts: recentlyViewedProducts.map(processProductPrice),
            relatedProducts: relatedProducts.map(processProductPrice),
        });

    } catch (err) {
        response.serverError(res, err);
    }
};


module.exports = {
    viewProduct,
}

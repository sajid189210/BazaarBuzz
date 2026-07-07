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
                product: null,
                categories: await Category.find(),
                searchBox: true,
                user: req.session.user || null,
            });
        }

        const offers = await Offer.find({ isActive: true });
        const categories = await Category.find();

        const offerIndex = offers.findIndex(offer => offer.brandName === product.brand);

        const productDiscountedPrice = product.productPrice - ((product.productPrice * product.discount) / 100);

        let offerDiscountedPrice = productDiscountedPrice;
        let totalDiscount = product.discount;
        let offerDiscountValue;
        if (offerIndex !== -1) {
            offerDiscountValue = offers[offerIndex].discount;
            offerDiscountedPrice = productDiscountedPrice - ((productDiscountedPrice * offerDiscountValue) / 100);
            totalDiscount = 100 - ((offerDiscountedPrice * 100) / product.productPrice);
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
            const wishlist = await Wishlist.findOne({ userId: req.session.user._id });
            if (wishlist && wishlist.products) {
                isInWishlist = wishlist.products.some(p => p.productId.toString() === productId);
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
            const discPrice = p.discount ? Math.round(p.productPrice - (p.productPrice * p.discount / 100)) : p.productPrice;
            const matchedOffer = offers.find(o => o.brandName === p.brand);
            let finalPrice = discPrice;
            if (matchedOffer && matchedOffer.discount > 0) {
                finalPrice = Math.round(discPrice - (discPrice * matchedOffer.discount / 100));
            }
            return { ...p, finalPrice, discPrice, hasOffer: !!matchedOffer, offerName: matchedOffer?.offerName, offerDiscount: matchedOffer?.discount };
        };

        // Design tokens for semantic styling
        const designTokens = {
            colors: {
                accent: '#e11d48', // rose-600
                accentHover: '#be123c', // rose-700
                accentLight: '#fff1f2', // rose-50
                accentBorder: '#fecdd3', // rose-200
                surface: '#ffffff',
                surfaceElevated: '#fafafa',
                textPrimary: '#111827', // gray-900
                textSecondary: '#6b7280', // gray-500
                textMuted: '#9ca3af', // gray-400
                border: '#e5e7eb', // gray-200
                borderHover: '#d1d5db', // gray-300
                success: '#16a34a', // green-600
                warning: '#f59e0b', // amber-500
                error: '#dc2626', // red-600
            },
            radius: {
                sm: '6px',
                md: '10px',
                lg: '14px',
                xl: '18px',
                full: '9999px',
            },
            shadow: {
                sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            },
            spacing: {
                xs: '4px',
                sm: '8px',
                md: '16px',
                lg: '24px',
                xl: '32px',
                '2xl': '48px',
            },
            motion: {
                fast: '150ms',
                normal: '250ms',
                slow: '400ms',
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
        };

        res.render('user/userProductView', {
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
            designTokens: JSON.stringify(designTokens),
        });

    } catch (err) {
        response.serverError(res, err);
    }
};


module.exports = {
    viewProduct,
}

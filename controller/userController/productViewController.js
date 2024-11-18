const Product = require('../../model/productModel');
const Category = require('../../model/categoryModel');
const Offer = require('../../model/offerModel');

const viewProduct = async (req, res) => {
    try {
        const { productId } = req.query;
        const product = await Product.findOne({ _id: productId });
        const offers = await Offer.find({ isActive: true });
        const categories = await Category.find();

        const index = offers.findIndex(offer => offer.brandName === product.brand);

        const productDiscountedPrice = product.productPrice - ((product.productPrice * product.discount) / 100);

        let offerDiscountedPrice = productDiscountedPrice;
        let totalDiscount = product.discount;
        let offerDiscountValue;
        if (index !== -1) {
            offerDiscountValue = offers[index].discount;
            offerDiscountedPrice = productDiscountedPrice - ((productDiscountedPrice * offerDiscountValue) / 100);
            totalDiscount = 100 - ((offerDiscountedPrice * 100) / product.productPrice);
        }

        res.render('user/userProductView', {
            offerDiscountedPrice: offerDiscountedPrice.toFixed(2),
            offerDiscountValue,
            totalDiscount,
            categories,
            searchBox: true,
            product,
            user: req.session.user || null,
        });

    } catch (err) {
        console.error(`Error caught viewProduct in the productViewController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


module.exports = {
    viewProduct,
}

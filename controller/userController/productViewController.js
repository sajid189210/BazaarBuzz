const Product = require('../../model/productModel');
const User = require('../../model/userModel');
const Category = require('../../model/categoryModel');

const viewProduct = async (req, res) => {
    try {
        const { productId } = req.query;
        const product = await Product.findOne({ _id: productId });

        const categories = await Category.find();
        res.render('user/userProductView', {
            user: req.session.user || null,
            product,
            categories
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

const categoryModel = require('../../model/categoryModel');
const { body, validationResult } = require('express-validator');

const listProducts = (req, res) => {
    res.render('admin/productManagementPage');
};

// // .custom((value, { req }) => value.split('').map((char, index) =>
// //     index === 0 ? char.toUpperCase() : char.toLowerCase()).join('')),
//*------------Create Product Page : GET---------------------------------------------------------------------------
const getCreateProducts = async (req, res) => {
    try {

        // if(!req.session.admin) return res.redirect()
        const Category = await categoryModel.find();

        res.render('admin/createProduct', { Category });


    } catch (err) {
        console.error(`Error caught createProducts in the productController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

//*----------------Create Product Page : POST------------------------------------------------------------------------------------
const postCreateProducts = async (req, res) => {
    try {

        const { productName,
            category,
            brands,
            price,
            discount,
            color,
            size,
            stock,
            gender,
            file,
            description
        } = req.body;

        console.log(req.body);

    } catch (err) {
        console.error(`Error caught createProducts in the productController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
}

module.exports = {
    // selectBrand,
    listProducts,
    getCreateProducts,
    postCreateProducts,
}
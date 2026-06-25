const categoryModel = require('../../model/categoryModel');
const mongoose = require('mongoose');
const Product = require('../../model/productModel');
const path = require('path');
const fs = require('fs');


//* middleware for getting selected category from the product update.
const getCategory = async (req, res) => {
    const categoryId = req.params.id;
    try {
        const category = await categoryModel.findById(categoryId);
        if (!category) return res.status(400).json({
            success: false,
            message: 'Category not found'
        });

        return res.status(200).json({
            success: true,
            message: 'Category found',
            category
        });

    } catch (err) {
        console.error(`Error caught getId in the productController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


const getProducts = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect('/admin/SignIn');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        const skip = (page - 1) * limit;

        const products = await Product.find({ isDeleted: false }).skip(skip).limit(limit).sort({ createdAt: -1 }).populate('categoryId');
        const categories = await categoryModel.find();
        const count = await Product.countDocuments({ isDeleted: false });


        if (!products) throw new Error("Error caught while fetching product data.");

        res.render('admin/productList', {
            products,
            categories,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit,
            page
        });

    } catch (err) {
        console.error(`Error caught getProducts in the productController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

//*------------Create Product Page : GET---------------------------------------------------------------------------
const getCreateProducts = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect('/admin/SignIn');
        const Category = await categoryModel.find();

        if (!Category) throw new Error("Error caught while fetching category data.");

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
const createProducts = async (req, res) => {
    const { productDetails } = req.body;
    try {

        if (!productDetails) return res.status(201).json({
            success: false,
            message: 'Product details not found.'
        });

        const newProduct = new Product(productDetails);

        try {
            await newProduct.save();
        } catch (err) {
            console.error(err)
            throw new Error("Error caught while save product data to the db.", err);
        }

        res.status(201).json({
            success: true,
            message: 'Product successfully created.'
        });

    } catch (err) {
        console.error(`Error caught createProducts in the productController${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


const productUpdate = async (req, res) => {
    try {

        const { productId } = req.query;
        const { productDetails } = req.body;

        if (!productDetails || !productId) return res.status(400).json({
            success: false,
            message: "Missing required fields. Please provide both productId and productDetails"
        });

        const updatedProduct = await Product.findByIdAndUpdate(productId,
            { $set: productDetails },
            { new: true }
        );

        if (!updatedProduct) return res.status(404).json({
            success: false,
            message: "Product not found"
        });

        res.status(200).json({
            success: true,
            message: "Product details updated successfully",
        });

    } catch (err) {
        console.error(`Error caught productUpdate in the productController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const isActive = async (req, res) => {
    const { isActive, productId } = req.body;
    try {

        const product = await Product.findById(productId);

        if (!product) return res.status(400).json({
            success: false,
            message: 'Product not found'
        });

        const updatedProduct = await Product.findByIdAndUpdate(productId,
            { $set: { isActive: req.body.isActive } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            updatedProduct
        });

    } catch (err) {
        console.error(`Error caught createProducts in the productController${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


const searchProduct = async (req, res) => {
    const search = req.query.search || '';
    try {
        const regex = new RegExp(search, 'i');
        const products = await Product.find({ productName: regex });

        res.json({ products });

    } catch (err) {
        console.error(`Error in searchUser in userManagementController: ${err.message}`);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
}


const extractFilePath = async (req, res) => {
    try {
        if (!req.file) {
            throw new Error("No file was uploaded");
        }

        const imageUrl = req.file.path;

        if (!imageUrl) {
            throw new Error("Failed to get image URL from Cloudinary");
        }

        res.json({ success: true, imageUrl });

    } catch (err) {
        console.error(`Error in extractFilePath: ${err.message}`);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: err.message
        });
    }
}

const removeProduct = async (req, res) => {
    const { productId } = req.query;
    try {

        if (!productId) return res.status(400).json({
            success: false,
            message: 'Product ID not found.'
        });

        const product = await Product.findById(productId);

        if (!product) return res.status(404).json({
            success: false,
            message: 'Product not found.'
        });

        const removedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: { isDeleted: true } },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Product removed successfully",
            product: removedProduct
        });

    } catch (err) {
        console.error(`Error in removeProduct: ${err.message}`);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: err.message
        });
    }
}


module.exports = {
    createProducts,
    getCreateProducts,
    productUpdate,
    searchProduct,
    extractFilePath,
    getProducts,
    isActive,
    getCategory,
    removeProduct
}
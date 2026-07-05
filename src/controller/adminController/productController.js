const response = require('../../Services/responseMapper');
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
        if (!category) return response.error(res, "Category not found", 400);

        return response.success(res, { category }, 'Category found');

    } catch (err) {
        response.serverError(res, err);
    }
};


const getProducts = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect('/admin/signIn');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        const skip = (page - 1) * limit;

        const products = await Product.find({ isDeleted: false }).skip(skip).limit(limit).sort({ createdAt: -1 });
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
        response.serverError(res, err);
    }
};

//*------------Create Product Page : GET---------------------------------------------------------------------------
const getCreateProducts = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect('/admin/signIn');
        const Category = await categoryModel.find();

        if (!Category) throw new Error("Error caught while fetching category data.");

        res.render('admin/createProduct', { Category });

    } catch (err) {
        response.serverError(res, err);
    }
};

//*----------------Create Product Page : POST------------------------------------------------------------------------------------
const createProducts = async (req, res) => {
    try {
        const { productName, brand, category, productPrice, stock, discount, productDescription } = req.body;
        const sizes = Array.isArray(req.body.size) ? req.body.size : (req.body.size ? [req.body.size] : []);
        const colors = req.body.colors ? (Array.isArray(req.body.colors) ? req.body.colors : [req.body.colors]) : [];

        if (sizes.length === 0) {
            return res.redirect('/admin/productList/create');
        }

        let categoryName;
        if (category) {
            const catDoc = await categoryModel.findById(category);
            if (catDoc) categoryName = catDoc.title;
        }

        const productData = {
            productName,
            brand,
            category: categoryName || undefined,
            productPrice: Number(productPrice),
            discount: Number(discount) || 0,
            description: productDescription,
            variants: sizes.length > 0 ? sizes.map(s => ({
                size: s,
                stock: Number(stock) || 0,
                colors: colors.length > 0 ? colors : []
            })) : undefined,
            images: req.body.images || []
        };

        Object.keys(productData).forEach(k => productData[k] === undefined && delete productData[k]);

        const newProduct = new Product(productData);
        await newProduct.save();

        res.redirect('/admin/productList');

    } catch (err) {
        response.serverError(res, err);
    }
};


const productUpdate = async (req, res) => {
    try {

        const { productId } = req.query;
        const { productDetails } = req.body;

        if (!productDetails || !productId) return response.error(res, "Missing required fields. Please provide both productId and productDetails", 400);

        const updatedProduct = await Product.findByIdAndUpdate(productId,
            { $set: productDetails },
            { new: true }
        );

        if (!updatedProduct) return response.error(res, "Product not found", 404);

        response.success(res, {}, "Product updated successfully");

    } catch (err) {
        response.serverError(res, err);
    }
};

const isActive = async (req, res) => {
    const { productId } = req.body;
    try {

        const product = await Product.findById(productId);

        if (!product) return response.error(res, "Product not found", 400);

        const updatedProduct = await Product.findByIdAndUpdate(productId,
            { $set: { isActive: !product.isActive } },
            { new: true }
        );

        const status = updatedProduct.isActive ? 'active' : 'inactive';
        response.success(res, { updatedProduct }, `Product is now ${status}`);

    } catch (err) {
        response.serverError(res, err);
    }
};


const searchProduct = async (req, res) => {
    const search = req.query.search || '';
    try {
        const regex = new RegExp(search, 'i');
        const products = await Product.find({ productName: regex });

        response.success(res, { products });

    } catch (err) {
        response.serverError(res, err);
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
        response.serverError(res, err);
    }
}

const getEditProduct = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect('/admin/signIn');
        const productId = req.params.id;
        const product = await Product.findById(productId);
        const categories = await categoryModel.find();
        if (!product) return res.redirect('/admin/productList');
        res.render('admin/editProduct', { product, categories });
    } catch (err) {
        response.serverError(res, err);
    }
};

const postEditProduct = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect('/admin/signIn');
        const productId = req.params.id;
        const { productName, brand, category, productPrice, stock, discount, productDescription } = req.body;
        const sizes = Array.isArray(req.body.size) ? req.body.size : (req.body.size ? [req.body.size] : []);
        const colors = req.body.colors ? (Array.isArray(req.body.colors) ? req.body.colors : [req.body.colors]) : [];
        const images = req.body.images ? (Array.isArray(req.body.images) ? req.body.images : [req.body.images]) : [];

        if (sizes.length === 0) {
            return res.redirect('/admin/productList');
        }

        let categoryName;
        if (category) {
            const catDoc = await categoryModel.findById(category);
            if (catDoc) categoryName = catDoc.title;
        }

        const updateData = {
            productName,
            brand,
            category: categoryName || undefined,
            productPrice: Number(productPrice),
            discount: Number(discount) || 0,
            description: productDescription,
            images: images.length > 0 ? images : undefined,
            variants: sizes.length > 0 ? sizes.map(s => ({
                size: s,
                stock: Number(stock) || 0,
                colors: colors.length > 0 ? colors : []
            })) : undefined
        };

        // Remove undefined keys
        Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

        const updated = await Product.findByIdAndUpdate(productId,
            { $set: updateData },
            { new: true }
        );

        if (!updated) return response.error(res, "Product not found", 404);
        res.redirect('/admin/productList');
    } catch (err) {
        response.serverError(res, err);
    }
};

const removeProduct = async (req, res) => {
    const { productId } = req.query;
    try {

        if (!productId) return response.error(res, "Product ID not found.", 400);

        const product = await Product.findById(productId);

        if (!product) return response.error(res, "Product not found.", 404);

        const removedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: { isDeleted: true } },
            { new: true }
        );

        return response.success(res, { product: removedProduct }, 'Product removed successfully');

    } catch (err) {
        response.serverError(res, err);
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
    removeProduct,
    getEditProduct,
    postEditProduct
}
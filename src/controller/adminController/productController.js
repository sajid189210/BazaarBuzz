const R = require('../../constants/redirects');
const MSG = require('../../constants/messages');
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
        if (!category) return response.error(res, MSG.CATEGORY_NOT_FOUND, 400);

        return response.success(res, { 
            category: {
                _id: category._id,
                title: category.title,
                brands: category.brands || []
            }
        }, MSG.CATEGORY_FOUND);

    } catch (err) {
        response.serverError(res, err);
    }
};


const getProducts = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect(R.ADMIN_SIGNIN);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const status = req.query.status || '';
        const stock = req.query.stock || '';

        const skip = (page - 1) * limit;

        // Build filter query
        const filter = { isDeleted: false };
        
        if (search) {
            filter.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (category) {
            filter.category = category;
        }
        
        if (status !== '') {
            filter.isActive = status === 'true';
        }
        
        // Build the base query
        let query = Product.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });
        
        // Apply stock filter using aggregation for variant stock checking
        if (stock === 'instock' || stock === 'outofstock') {
            const stockFilter = stock === 'instock' ? { $gt: 0 } : { $lte: 0 };
            query = Product.aggregate([
                { $match: filter },
                { $addFields: { 
                    totalStock: { $sum: "$variants.stock" },
                    hasStock: { $gt: [{ $sum: "$variants.stock" }, 0] }
                }},
                { $match: { 
                    totalStock: stockFilter 
                }},
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);
        }

        const products = await query;
        const categories = await categoryModel.find();
        
        // Get total count with stock filter applied
        let count;
        if (stock === 'instock' || stock === 'outofstock') {
            const stockFilter = stock === 'instock' ? { $gt: 0 } : { $lte: 0 };
            const countResult = await Product.aggregate([
                { $match: filter },
                { $addFields: { totalStock: { $sum: "$variants.stock" } } },
                { $match: { totalStock: stockFilter } },
                { $count: "total" }
            ]);
            count = countResult.length > 0 ? countResult[0].total : 0;
        } else {
            count = await Product.countDocuments(filter);
        }


        if (!products) throw new Error("Error caught while fetching product data.");

        res.render('admin/productList', {
            layout: 'admin/layout',
            title: 'Products',
            products,
            categories,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit,
            page,
            searchQuery: search,
            categoryFilter: category,
            statusFilter: status,
            stockFilter: stock,
            totalCount: count
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

// JSON endpoint for AJAX requests
const getProductsJson = async (req, res) => {
    try {

        if (!req.session.admin) return response.error(res, MSG.UNAUTHORIZED_AJAX, 401);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const status = req.query.status || '';
        const stock = req.query.stock || '';

        const skip = (page - 1) * limit;

        // Build filter query
        const filter = { isDeleted: false };
        
        if (search) {
            filter.$or = [
                { productName: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (category) {
            filter.category = category;
        }
        
        if (status !== '') {
            filter.isActive = status === 'true';
        }
        
        // Build the base query
        let query = Product.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });
        
        // Apply stock filter using aggregation for variant stock checking
        if (stock === 'instock' || stock === 'outofstock') {
            const stockFilter = stock === 'instock' ? { $gt: 0 } : { $lte: 0 };
            query = Product.aggregate([
                { $match: filter },
                { $addFields: { 
                    totalStock: { $sum: "$variants.stock" },
                    hasStock: { $gt: [{ $sum: "$variants.stock" }, 0] }
                }},
                { $match: { 
                    totalStock: stockFilter 
                }},
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]);
        }

        const products = await query;
        
        // Get total count with stock filter applied
        let count;
        if (stock === 'instock' || stock === 'outofstock') {
            const stockFilter = stock === 'instock' ? { $gt: 0 } : { $lte: 0 };
            const countResult = await Product.aggregate([
                { $match: filter },
                { $addFields: { totalStock: { $sum: "$variants.stock" } } },
                { $match: { totalStock: stockFilter } },
                { $count: "total" }
            ]);
            count = countResult.length > 0 ? countResult[0].total : 0;
        } else {
            count = await Product.countDocuments(filter);
        }

        response.success(res, {
            products,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalCount: count,
            limit
        }, MSG.PRODUCTS_FETCHED);

    } catch (err) {
        response.serverError(res, err);
    }
};

//*------------Create Product Page : GET---------------------------------------------------------------------------
const getCreateProducts = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect(R.ADMIN_SIGNIN);
        const Category = await categoryModel.find();

        if (!Category) throw new Error("Error caught while fetching category data.");

        res.render('admin/createProduct', { layout: 'admin/layout', title: 'Create Product', Category });

    } catch (err) {
        response.serverError(res, err);
    }
};

//*----------------Create Product Page : POST------------------------------------------------------------------------------------
const createProducts = async (req, res) => {
    try {
        const { productName, brand, category, productPrice, discount, productDescription } = req.body;
        
        // Handle new variant structure: variants[size][stock], variants[size][colors]
        const variants = req.body.variants || [];
        
        if (!variants || variants.length === 0) {
            return res.redirect(R.ADMIN_PRODUCT_CREATE);
        }

        let categoryName;
        if (category) {
            const catDoc = await categoryModel.findById(category);
            if (catDoc) categoryName = catDoc.title;
        }

        // Process variants - each variant has size, stock, and colors array
        const processedVariants = variants.map(v => ({
            size: v.size,
            stock: Number(v.stock) || 0,
            colors: v.colors ? (Array.isArray(v.colors) ? v.colors : [v.colors]) : []
        }));

        const productData = {
            productName,
            brand,
            category: categoryName || undefined,
            productPrice: Number(productPrice),
            discount: Number(discount) || 0,
            description: productDescription,
            variants: processedVariants,
            images: req.body.images || []
        };

        Object.keys(productData).forEach(k => productData[k] === undefined && delete productData[k]);

        const newProduct = new Product(productData);
        await newProduct.save();

        res.redirect(R.ADMIN_PRODUCT_LIST);

    } catch (err) {
        response.serverError(res, err);
    }
};


const productUpdate = async (req, res) => {
    try {

        const { productId } = req.query;
        const { productDetails } = req.body;

        if (!productDetails || !productId) return response.error(res, MSG.MISSING_REQUIRED_FIELDS, 400);

        const updatedProduct = await Product.findByIdAndUpdate(productId,
            { $set: productDetails },
            { new: true }
        );

        if (!updatedProduct) return response.error(res, MSG.PRODUCT_NOT_FOUND, 404);

        response.success(res, {}, MSG.PRODUCT_UPDATED);

    } catch (err) {
        response.serverError(res, err);
    }
};

const isActive = async (req, res) => {
    const { productId } = req.body;
    try {

        const product = await Product.findById(productId);

        if (!product) return response.error(res, MSG.PRODUCT_NOT_FOUND, 400);

        const updatedProduct = await Product.findByIdAndUpdate(productId,
            { $set: { isActive: !product.isActive } },
            { new: true }
        );

        const status = updatedProduct.isActive ? 'active' : 'inactive';
        response.success(res, { updatedProduct }, MSG.PRODUCT_STATUS(status));

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
        if (!req.session.admin) return res.redirect(R.ADMIN_SIGNIN);
        const productId = req.params.id;
        const product = await Product.findById(productId);
        const categories = await categoryModel.find();
        if (!product) return res.redirect(R.ADMIN_PRODUCT_LIST);
        res.render('admin/editProduct', { layout: 'admin/layout', title: 'Edit Product', product, categories });
    } catch (err) {
        response.serverError(res, err);
    }
};

const postEditProduct = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect(R.ADMIN_SIGNIN);
        const productId = req.params.id;
        const { productName, brand, category, productPrice, discount, productDescription } = req.body;
        
        // Handle new variant structure: variants[size][stock], variants[size][colors]
        const variants = req.body.variants || [];
        const images = req.body.images ? (Array.isArray(req.body.images) ? req.body.images : [req.body.images]) : [];

        if (!variants || variants.length === 0) {
            return res.redirect(R.ADMIN_PRODUCT_LIST);
        }

        let categoryName;
        if (category) {
            const catDoc = await categoryModel.findById(category);
            if (catDoc) categoryName = catDoc.title;
        }

        // Process variants - each variant has size, stock, and colors array
        const processedVariants = variants.map(v => ({
            size: v.size,
            stock: Number(v.stock) || 0,
            colors: v.colors ? (Array.isArray(v.colors) ? v.colors : [v.colors]) : []
        }));

        const updateData = {
            productName,
            brand,
            category: categoryName || undefined,
            productPrice: Number(productPrice),
            discount: Number(discount) || 0,
            description: productDescription,
            images: images.length > 0 ? images : undefined,
            variants: processedVariants
        };

        // Remove undefined keys
        Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

        const updated = await Product.findByIdAndUpdate(productId,
            { $set: updateData },
            { new: true }
        );

        if (!updated) return response.error(res, MSG.PRODUCT_NOT_FOUND, 404);
        res.redirect(R.ADMIN_PRODUCT_LIST);
    } catch (err) {
        response.serverError(res, err);
    }
};

const removeProduct = async (req, res) => {
    const productId = req.params.id;
    try {

        if (!productId) return response.error(res, MSG.PRODUCT_ID_NOT_FOUND, 400);

        const product = await Product.findById(productId);

        if (!product) return response.error(res, MSG.PRODUCT_NOT_FOUND, 404);

        const removedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: { isDeleted: true } },
            { new: true }
        );

        return response.success(res, { product: removedProduct }, MSG.PRODUCT_REMOVED);

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
    getProductsJson,
    isActive,
    getCategory,
    removeProduct,
    getEditProduct,
    postEditProduct
}

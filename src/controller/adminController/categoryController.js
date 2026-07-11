const response = require('../../Services/responseMapper');
const categoryModel = require('../../model/categoryModel');
const productModel = require('../../model/productModel');

const createCategoryInstance = (title, brands) => {
    return new categoryModel({ title, brands });
};

const handleDuplicateError = (err, res) => {
    if (err.code === 11000 || err.code === 11001) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        return response.error(res, `A category with this ${field} already exists.`, 409);
    }
    return false;
};

const createCategory = async (req, res) => {
    const { title, brandName } = req.body;
    try {
        if (!title || !brandName) return response.error(res, "Title and brand are required.", 400);

        const modTitle = title.trim().toLowerCase();
        const brands = brandName.split(',').map(b => b.trim().toLowerCase()).filter(b => b.length > 0);

        if (!modTitle || brands.length === 0) return response.error(res, "Please fill out all the fields.", 400);

        let category = await categoryModel.findOne({ title: modTitle });

        if (category) {
            const existingBrands = brands.filter(b => category.brands.some(cb => cb.toLowerCase() === b));
            if (existingBrands.length > 0) {
                return response.error(res, `Brand(s) already exist in this category: ${existingBrands.join(', ')}`, 400);
            }
            category.brands.push(...brands);
            await category.save();
            return response.success(res, {}, "Brands added to category successfully!");
        } else {
            const newCategory = createCategoryInstance(modTitle, brands);
            await newCategory.save();
            return response.success(res, {}, "Category created successfully!", 201);
        }
    } catch (err) {
        if (handleDuplicateError(err, res)) return;
        response.serverError(res, err);
    }
};

const updateCategory = async (req, res) => {
    try {
        const { title, brandName, categoryId } = req.body;

        if (!title || !categoryId) return response.error(res, "Title and categoryId are required.", 400);

        const modTitle = title.trim().toLowerCase();

        const existing = await categoryModel.findOne({ title: modTitle, _id: { $ne: categoryId } });
        if (existing) return response.error(res, "Another category with this title already exists.", 409);

        const brands = brandName
            ? brandName.split(',').map(b => b.trim().toLowerCase()).filter(b => b.length > 0)
            : [];

        const updateData = { title: modTitle };
        if (brands.length > 0) updateData.brands = brands;

        const result = await categoryModel.findByIdAndUpdate(
            categoryId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!result) return response.error(res, "Category not found.", 404);

        response.success(res, {}, "Category updated successfully!");
    } catch (err) {
        if (handleDuplicateError(err, res)) return;
        response.serverError(res, err);
    }
};

const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id;

        const category = await categoryModel.findById(id);
        if (!category) return response.error(res, "Category not found!", 404);

        category.isDeleted = true;
        category.isActive = false;
        await category.save();

        await productModel.updateMany(
            { category: category.title },
            { $set: { isActive: false } }
        );

        response.success(res, {}, "Category deleted successfully!");
    } catch (err) {
        response.serverError(res, err);
    }
};

const adminCategory = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect('/admin/signIn');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalCategories = await categoryModel.countDocuments({ isDeleted: false });
        const categories = await categoryModel.find({ isDeleted: false }).skip(skip).limit(limit).sort({ createdAt: -1 });

        res.render('admin/adminCategory', {
            layout: false,
            categories: categories || [],
            currentPage: page,
            totalPages: Math.ceil(totalCategories / limit),
            limit
        });
    } catch (err) {
        response.serverError(res, err);
    }
};

const changeCategoryStatus = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) return response.error(res, "Category ID not found.", 400);

        const category = await categoryModel.findById(id);
        if (!category) return response.error(res, "Category not found.", 404);

        category.isActive = !category.isActive;
        await category.save();

        await productModel.updateMany(
            { category: category.title },
            { $set: { isActive: category.isActive } }
        );

        response.success(res, { isActive: category.isActive });
    } catch (err) {
        response.serverError(res, err);
    }
};

module.exports = {
    createCategory,
    adminCategory,
    updateCategory,
    deleteCategory,
    changeCategoryStatus
};

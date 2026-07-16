const R = require('../../constants/redirects');
const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const categoryModel = require('../../model/categoryModel');
const productModel = require('../../model/productModel');
const offerModel = require('../../model/offerModel');

const createCategoryInstance = (title, brands) => {
    return new categoryModel({ title, brands });
};

const handleDuplicateError = (err, res) => {
    if (err.code === 11000 || err.code === 11001) {
        const field = Object.keys(err.keyPattern || {})[0] || 'field';
        return response.error(res, MSG.CATEGORY_FIELD_EXISTS(field), 409);
    }
    return false;
};

const createCategory = async (req, res) => {
    const { title, brandName } = req.body;
    try {
        if (!title || !brandName) return response.error(res, MSG.CATEGORY_TITLE_BRAND_REQUIRED, 400);

        const modTitle = title.trim().toLowerCase();
        const brands = brandName.split(',').map(b => b.trim().toLowerCase()).filter(b => b.length > 0);

        if (!modTitle || brands.length === 0) return response.error(res, MSG.CATEGORY_FILL_ALL_FIELDS, 400);

        let category = await categoryModel.findOne({ title: modTitle });

        if (category) {
            const existingBrands = brands.filter(b => category.brands.some(cb => cb.toLowerCase() === b));
            if (existingBrands.length > 0) {
                return response.error(res, MSG.CATEGORY_BRANDS_EXIST(existingBrands.join(', ')), 400);
            }
            category.brands.push(...brands);
            await category.save();
            return response.success(res, {}, MSG.CATEGORY_BRANDS_ADDED);
        } else {
            const newCategory = createCategoryInstance(modTitle, brands);
            await newCategory.save();
            return response.success(res, {}, MSG.CATEGORY_CREATED, 201);
        }
    } catch (err) {
        if (handleDuplicateError(err, res)) return;
        response.serverError(res, err);
    }
};

const updateCategory = async (req, res) => {
    try {
        const { title, brandName, categoryId } = req.body;

        if (!title || !categoryId) return response.error(res, MSG.CATEGORY_TITLE_ID_REQUIRED, 400);

        const modTitle = title.trim().toLowerCase();

        const existing = await categoryModel.findOne({ title: modTitle, _id: { $ne: categoryId } });
        if (existing) return response.error(res, MSG.CATEGORY_TITLE_EXISTS, 409);

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

        if (!result) return response.error(res, MSG.CATEGORY_NOT_FOUND, 404);

        response.success(res, {}, MSG.CATEGORY_UPDATED);
    } catch (err) {
        if (handleDuplicateError(err, res)) return;
        response.serverError(res, err);
    }
};

const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id;

        const category = await categoryModel.findById(id);
        if (!category) return response.error(res, MSG.CATEGORY_NOT_FOUND, 404);

        category.isDeleted = true;
        category.isActive = false;
        await category.save();

        await productModel.updateMany(
            { category: category.title },
            { $set: { isActive: false } }
        );

        await offerModel.updateMany(
            { category: category._id },
            { $set: { isActive: false } }
        );

        response.success(res, {}, MSG.CATEGORY_DELETED);
    } catch (err) {
        response.serverError(res, err);
    }
};

const adminCategory = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect(R.ADMIN_SIGNIN);

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
        if (!id) return response.error(res, MSG.CATEGORY_ID_NOT_FOUND, 400);

        const category = await categoryModel.findById(id);
        if (!category) return response.error(res, MSG.CATEGORY_NOT_FOUND, 404);

        category.isActive = !category.isActive;
        await category.save();

        await productModel.updateMany(
            { category: category.title },
            { $set: { isActive: category.isActive } }
        );

        await offerModel.updateMany(
            { category: category._id },
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

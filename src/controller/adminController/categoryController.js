const response = require('../../Services/responseMapper');
const categoryModel = require('../../model/categoryModel');

const createCategoryInstance = (title, brand) => {
    return new categoryModel({ title, brands: [brand] });
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
        const modBrand = brandName.trim().toLowerCase();

        if (!modTitle || !modBrand) return response.error(res, "Please fill out all the fields.", 400);

        let category = await categoryModel.findOne({ title: modTitle });

        if (category) {
            const existingBrand = category.brands.find(b => b.toLowerCase() === modBrand);
            if (existingBrand) {
                return response.error(res, "Brand already exists in this category!", 400);
            }
            category.brands.push(modBrand);
            await category.save();
            return response.success(res, {}, "Brand added to category successfully!");
        } else {
            const newCategory = createCategoryInstance(modTitle, modBrand);
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

        const result = await categoryModel.deleteOne({ _id: id });

        if (result.deletedCount === 0) {
            return response.error(res, "Failed to delete category!", 400);
        }

        response.success(res, {}, "Category deleted successfully!");
    } catch (err) {
        response.serverError(res, err);
    }
};

const adminCategory = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect('/admin/signIn');

        const categories = await categoryModel.find({});

        if (!categories) return res.render('admin/adminCategory', {
            message: req.flash(),
            categories: []
        });

        res.render('admin/adminCategory', { categories });
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

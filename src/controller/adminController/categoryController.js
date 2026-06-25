const response = require('../../Services/responseMapper');
const categoryModel = require('../../model/categoryModel');


//?--------to capitalize the first letter of a word-------------
const capitalizeFirstLetter = (word) => {
    try {

        return word = word.split('').map((char, index) =>
            index === 0 ? char.toUpperCase() : char.toLowerCase()).join('');

    } catch (err) {
        throw new Error(`Failed to capitalize the first letter in categoryController.${err}`);
    }
};

//*-------------create Category Instance----------
const createCategoryInstance = (title, brand) => {
    try {
        return new categoryModel({
            title,
            brands: [brand]
        });
    } catch (err) {
        throw new Error(`Failed to create new instance of the category.${err}`);
    }
}


//*-----------------save to database------------
const saveToDatabase = async (newCategory) => {
    try {
        return await newCategory.save();
    } catch (err) {
        throw new Error(`Failed to save category to the database ${err}`);
    }
}


//*--------------------Create category/Update category----------------------
const createCategory = async (req, res) => {
    const { title, brand } = req.body;
    try {

        if (!title || !brand) response.error(res, "title and brand were not found", 400);

        const modTitle = title.trim().toLowerCase();
        const modBrand = brand.trim().toLowerCase();

        if (!modTitle || !modBrand) return response.error(res, "Please fill out all the fields *", 400)

        const capitalizedTitle = capitalizeFirstLetter(modTitle);

        const category = await categoryModel.findOne({ title: capitalizedTitle });

        if (category) {

            //If the category exists, check if the brand is in the category's brand list.
            if (category.brands.includes(brand)) {

                return response.error(res, "Brand already exists in this category!", 400);

            } else {

                //Add the new brand to the existing category.
                category.brands.push(brand);
                await category.save();

                return response.success(res, {}, "Item successfully added!");
            }

        } else {

            //If the category doesn't exist, create a new one.
            const newCategory = createCategoryInstance(capitalizedTitle, brand);
            await saveToDatabase(newCategory)
            return response.success(res, {}, "Category created successfully!", 201);
        }
    } catch (err) {
        response.serverError(res, err);
    }

}


//*------------------edit category----------------------------
const updateCategory = async (req, res) => {
    try {

        const { title, brandToBeDeleted, categoryId } = req.body

        if (!(title && brandToBeDeleted && categoryId)) return response.error(res, "title, brandToBeDeleted, or categoryId not found.", 400);

        if (!title || title.trim() === '') return response.error(res, "Title cannot be empty!", 400);

        const modTitle = capitalizeFirstLetter(title);

        const updateOperation = {
            $set: { title: modTitle },
        }

        //only add $pullAll if currentBrand.length>0.
        if (brandToBeDeleted.length > 0) {
            updateOperation.$pullAll = { brands: brandToBeDeleted };
        }

        const result = await categoryModel.findByIdAndUpdate(categoryId,
            updateOperation,
            { new: true }
        );

        if (!result || result.modifiedCount === 0) return response.error(res, "Failed to update the category!", 404);

        response.success(res, {}, "Successfully updated the category!");

    } catch (err) {
        response.serverError(res, err);
    }
}


const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id;

        const category = await categoryModel.findById(id);

        if (!category) {
            return response.error(res, "Category not found!", 404);
        }

        const result = await categoryModel.deleteOne({ _id: id }, { new: true });

        if (result.deletedCount === 0) {
            return response.error(res, "Failed to delete category!", 400);
        }

        response.success(res, {}, "$1");

    } catch (err) {
        response.serverError(res, err);
    }
}



//*-----------------admin Category page render-------------------
//render the dashboard.
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


//*-----------------change category status----------
const changeCategoryStatus = async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) return response.error(res, "Category ID not found.", 400);

        const { selectedOption } = req.body;

        if (!selectedOption) response.error(res, "selectedOption not found.", 400);

        const value = selectedOption === 'active' ? true : false;

        const category = await categoryModel.findOneAndUpdate(
            { _id: id },
            { $set: { isActive: value } },
            { new: true }
        );

        if (!category) return response.error(res, "Category not found.", 404)

        response.success(res, { isActive: category.isActive });

    } catch (err) {
        response.serverError(res, err);
    }
}



module.exports = {
    createCategory,
    adminCategory,
    updateCategory,
    deleteCategory,
    changeCategoryStatus
};
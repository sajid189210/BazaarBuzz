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

        if (!title || !brand) res.status(400).json({
            success: false,
            message: 'title and brand were not found'
        });

        const modTitle = title.trim().toLowerCase();
        const modBrand = brand.trim().toLowerCase();

        if (!modTitle || !modBrand) return res.status(400).json({
            success: false,
            message: "Please fill out all the fields *"
        })

        const capitalizedTitle = capitalizeFirstLetter(modTitle);

        const category = await categoryModel.findOne({ title: capitalizedTitle });

        if (category) {

            //If the category exists, check if the brand is in the category's brand list.
            if (category.brands.includes(brand)) {

                return res.status(400).json({
                    success: false,
                    message: "Brand already exists in this category!"
                });

            } else {

                //Add the new brand to the existing category.
                category.brands.push(brand);
                await category.save();

                return res.status(200).json({
                    success: true,
                    message: "Item successfully added!"
                });
            }

        } else {

            //If the category doesn't exist, create a new one.
            const newCategory = createCategoryInstance(capitalizedTitle, brand);
            await saveToDatabase(newCategory)
            return res.status(201).json({
                success: true,
                message: "Category created successfully!"
            });
        }
    } catch (err) {
        console.error(`Error caught createCategory in categoryController ${err}`);
        res.status(500).json({ error: `Internal server error!` });
    }

}


//*------------------edit category----------------------------
const updateCategory = async (req, res) => {
    try {

        const { title, brandToBeDeleted, categoryId } = req.body

        if (!(title && brandToBeDeleted && categoryId)) return res.status(400).json({
            success: false,
            message: 'title, brandToBeDeleted, or categoryId not found.'
        });

        if (!title || title.trim() === '') return res.status(400).json({
            success: false,
            message: "Title cannot be empty!"
        });

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

        if (!result || result.modifiedCount === 0) return res.status(404).json({
            success: false,
            message: "Failed to update the category!"
        });

        res.status(200).json({
            success: true,
            message: "Successfully updated the category!"
        });

    } catch (err) {
        console.error(`Error caught updateCategory in categoryController ${err}`);
        res.status(500).json("Internal server error!");
    }
}


const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id;

        const category = await categoryModel.findById(id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found!"
            });
        }

        const result = await categoryModel.deleteOne({ _id: id }, { new: true });

        if (result.deletedCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Failed to delete category!"
            });
        }

        res.status(200).json({
            success: true,
            message: "Category deleted successfully!",
        });

    } catch (err) {
        console.error(`Error caught deleteCategory in categoryController ${err}`);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: err.message
        });
    }
}



//*-----------------admin Category page render-------------------
//render the dashboard.
const adminCategory = async (req, res) => {
    try {

        // if (!req.session.admin) return res.redirect('/admin/signIn');

        const categories = await categoryModel.find({});

        if (!categories) return res.render('admin/adminCategory', {
            message: req.flash(),
            categories: []
        });

        res.render('admin/adminCategory', { categories });

    } catch (err) {
        console.error(`Error caught adminCategory in categoryController ${err}`);
        res.status(500).json("Internal server error!");
    }
};


//*-----------------change category status----------
const changeCategoryStatus = async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) return res.status(400).json({
            success: false,
            message: 'Category ID not found.'
        });

        const { selectedOption } = req.body;

        if (!selectedOption) res.status(400).json({
            success: false,
            message: 'selectedOption not found.'
        });

        const value = selectedOption === 'active' ? true : false;

        const category = await categoryModel.findOneAndUpdate(
            { _id: id },
            { $set: { isActive: value } },
            { new: true }
        );

        if (!category) return res.status(404).json({
            success: false,
            message: "Category not found."
        })

        res.status(200).json({
            success: true,
            isActive: category.isActive
        });

    } catch (err) {
        console.error(`Error caught changeCategoryStatus in categoryController ${err}`);
        res.status(500).json({ message: "Internal server error!" });
    }
}



module.exports = {
    createCategory,
    adminCategory,
    updateCategory,
    deleteCategory,
    changeCategoryStatus
};
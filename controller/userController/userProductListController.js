const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const User = require('../../model/userModel');

// ? getting category from the database.
const getCategory = async () => {
    try {
        return await Category.find({ isActive: true });
    } catch (err) {
        throw new Error("Error caught while getting categories from db.", err);
    }
};

// ? getting product from the database.
const getProduct = async () => {
    try {
        return await Product.find({ isActive: true, isDeleted: false }).populate({
            path: 'categoryId',
            match: { isActive: true },
            model: 'Category',
        });
    } catch (err) {
        throw new Error("Error caught while getting products from db.", err);
    }
};


//? function to filter the products based on category.
const filterProducts = async (filterData, products) => {
    try {

        let filterResult = products;

        // filter based on category.
        if (filterData.category) {
            filterResult = products.filter(product => product.categoryId.title === filterData.category);
        }

        // filter based on price if specified.
        if (filterData.price) {
            if (filterData.price === 'high') {
                filterResult = filterResult.sort((a, b) => b.productPrice - a.productPrice); //? Sort in descending order.
            } else if (filterData.price === 'low') {
                filterResult = filterResult.sort((a, b) => a.productPrice - b.productPrice); //? Sort in ascending order.
            }
        }

        // filter based on name if specified.
        if (filterData.name) {
            if (filterData.name === 'asc') {
                filterResult.sort((a, b) => a.productName.localeCompare(b.productName));  //? Sort in ascending order.
            } else if (filterData.name === 'desc') {
                filterResult.sort((a, b) => b.productName.localeCompare(a.productName));  //? Sort in descending order.
            }
        }
        return filterResult;
    } catch (err) {
        throw new Error("Error caught on filterProducts", err);
    }
}

//* this render the product list page
const renderProductList = async (req, res) => {
    const collectionId = req.params.id;

    try {
        if (!collectionId) throw new Error("Id not found");


        // Populate categories and products
        const categories = await getCategory();
        const products = await getProduct();

        // Render the page with searched products
        if (collectionId === 'search' && req.session.searchResult) {
            return res.render('user/userProductList', {
                user: req.session.user || null,
                categories,
                products: req.session.searchResult,
                collectionId,
            });
        }

        // Render the page with all products
        return res.render('user/userProductList', {
            user: req.session.user || null,
            categories,
            products,
            collectionId,
        });

    } catch (err) {
        console.error(`Error caught in renderProductList: ${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

//* this endpoint filters the product based on the selection.
const filterProductsList = async (req, res) => {
    const collectionId = req.params.id;
    const { categoryFilter, priceFilter, nameFilter } = req.query;
    let filteredProducts = [];

    try {
        if (!collectionId) throw new Error("Id not found");

        // Create filterData based on query parameters
        const filterData = {
            category: categoryFilter || null,
            price: priceFilter || null,
            name: nameFilter || null
        };

        // Populate products
        const products = await getProduct();

        // Apply filters if at least one is provided
        if (Object.values(filterData).some(value => value)) {
            // Apply filters
            filteredProducts = await filterProducts(filterData, products);

            return res.status(200).json({
                success: true,
                products: filteredProducts,
                collectionId
            });
        } else {

            // If no filters are applied, return all products
            return res.status(200).json({
                success: false,
                message: "Please select a filter",
                products,
                collectionId
            });
        }

    } catch (err) {
        console.error(`Error caught in filterProductsEndpoint: ${err}`);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};




// //* gets the filter product page.
// const getProductList = async (req, res) => {
//     const collectionId = req.params.id;
//     const { categoryFilter, priceFilter, nameFilter } = req.query;
//     let filteredProducts = [];

//     try {

//         if (!collectionId) throw new Error("Id not found");

//         // Create filterData based on query parameters
//         const filterData = {
//             category: categoryFilter || null,
//             price: priceFilter || null,
//             name: nameFilter || null
//         };

//         // populate the category and product.
//         const categories = await getCategory();
//         const products = await getProduct();

//         // default behavior of product list; sorted by createdAt: -1.
//         filteredProducts = products;

//         // Apply filtering only if at least one filter is provided
//         if (Object.values(filterData).some(value => value)) {
//             filteredProducts = await filterProducts(filterData, products);

//             // Return response as JSON or render the view based on the request type
//             if (req.xhr || req.headers.accept.includes('application/json')) {
//                 return res.status(200).json({
//                     success: true,
//                     categoryFilter: categoryFilter || null,
//                     priceFilter: priceFilter || null,
//                     nameFilter: nameFilter || null,
//                     products: filteredProducts,
//                     collectionId
//                 });
//             }
//         } else return res.status(400).json({ success: false });

//         return res.render('user/userProductList', {
//             user: req.session.user || null,
//             categories,
//             products: filteredProducts,
//             collectionId,
//         });

//     } catch (err) {
//         console.error(`Error caught in getProductList: ${err}`);
//         res.status(500).json({
//             error: "Internal server error",
//             message: err.message,
//             stack: err.stack,
//         });
//     }
// };


module.exports = {
    renderProductList,
    filterProductsList
};
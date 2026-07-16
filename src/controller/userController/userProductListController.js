const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const Offer = require('../../model/offerModel');

// ? getting category from the database.
const getCategory = async () => {
    try {
        return await Category.find({});
    } catch (err) {
        throw new Error("Error caught while getting categories from db.", err);
    }
};

// ? getting product from the database.
const getProduct = async () => {
    try {
        return await Product.find({ isActive: true, isDeleted: false });
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
            filterResult = products.filter(product => product.category === filterData.category);
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
// ? getting offers from the database.
const getOffers = async () => {
    try {
        return await Offer.find({ isActive: true });
    } catch (err) {
        throw new Error("Error caught while getting offers from db.", err);
    }
};

//* this render the product list page
const renderProductList = async (req, res) => {
    const collectionId = req.params.id;

    try {
        if (!collectionId) throw new Error("Id not found");


        // Populate categories, products and offers
        const [categories, products, offers] = await Promise.all([
            getCategory(),
            getProduct(),
            getOffers(),
        ]);

        // Render the page with searched products
        if (collectionId === 'search' && req.session.searchResult) {
            return res.render('user/userProductList', {
                title: 'Search Results',
                user: req.session.user || null,
                categories,
                products: req.session.searchResult,
                offers,
                collectionId,
                searchBox: true
            });
        }

        // Render the page with all products
        return res.render('user/userProductList', {
            title: 'All Products',
            collectionId,
            categories,
            searchBox: true,
            products,
            offers,
            user: req.session.user || null,
        });

    } catch (err) {
        response.serverError(res, err);}
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

        // Determine which products to show
        let resultProducts = products;
        if (Object.values(filterData).some(value => value)) {
            resultProducts = await filterProducts(filterData, products);
        }

        // If request prefers HTML (direct navigation), render the page
        if (req.accepts('html')) {
            const [categories, offers] = await Promise.all([
                getCategory(),
                getOffers(),
            ]);
            return res.render('user/userProductList', {
                title: categoryFilter ? `Category: ${categoryFilter}` : 'Filtered Products',
                user: req.session.user || null,
                categories,
                products: resultProducts,
                offers,
                collectionId,
                searchBox: true
            });
        }

        // Otherwise return JSON (AJAX from filter form)
        if (Object.values(filterData).some(value => value)) {
            return response.success(res, {
                success: true,
                products: resultProducts,
                collectionId
            });
        }

        return response.success(res, {
            success: false,
            message: MSG.SELECT_FILTER,
            products: resultProducts,
            collectionId
        });

    } catch (err) {
        response.serverError(res, err);}
};

module.exports = {
    renderProductList,
    filterProductsList
};
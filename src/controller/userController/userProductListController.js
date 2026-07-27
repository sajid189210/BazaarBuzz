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
            const catFilters = Array.isArray(filterData.category) ? filterData.category : [filterData.category];
            filterResult = products.filter(product => catFilters.includes(product.category));
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
                searchBox: true,
                categoryFilter: null,
                sort: null
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
            categoryFilter: null,
            sort: null
        });

    } catch (err) {
        response.serverError(res, err);}
};

//* this endpoint filters the product based on the selection.
const filterProductsList = async (req, res) => {
    const collectionId = req.params.id;
    const { categoryFilter, sort } = req.query;
    let filteredProducts = [];

    try {
        if (!collectionId) throw new Error("Id not found");

        // Map sort param to price/name filters
        let priceFilter = null;
        let nameFilter = null;
        if (sort === 'price_high') priceFilter = 'high';
        else if (sort === 'price_low') priceFilter = 'low';
        else if (sort === 'name_asc') nameFilter = 'asc';
        else if (sort === 'name_desc') nameFilter = 'desc';

        // Create filterData based on query parameters
        const filterData = {
            category: categoryFilter || null,
            price: priceFilter,
            name: nameFilter
        };

        // Populate products, categories and offers
        const [products, categories, offers] = await Promise.all([
            getProduct(),
            getCategory(),
            getOffers(),
        ]);

        // Determine which products to show
        let resultProducts = products;
        if (Object.values(filterData).some(value => value)) {
            resultProducts = await filterProducts(filterData, products);
        }

        // If request prefers HTML (direct navigation), render the page
        if (req.accepts('html')) {
            return res.render('user/userProductList', {
                title: categoryFilter ? (Array.isArray(categoryFilter) ? `Filtered (${categoryFilter.length} categories)` : `Category: ${categoryFilter}`) : 'Filtered Products',
                user: req.session.user || null,
                categories,
                products: resultProducts,
                offers,
                collectionId,
                searchBox: true,
                categoryFilter,
                sort
            });
        }

        // Otherwise return JSON (AJAX from filter form)
        if (Object.values(filterData).some(value => value)) {
            return response.success(res, {
                success: true,
                products: resultProducts,
                categories,
                offers,
                collectionId
            });
        }

        return response.success(res, {
            success: false,
            message: MSG.SELECT_FILTER,
            products: resultProducts,
            categories,
            offers,
            collectionId
        });

    } catch (err) {
        response.serverError(res, err);}
};

module.exports = {
    renderProductList,
    filterProductsList
};
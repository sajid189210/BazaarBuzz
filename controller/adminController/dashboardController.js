const Product = require('../../model/productModel');
const Order = require('../../model/orderModel');


const getMonthlySalesRevenue = async () => {
    try {
        const result = await Order.aggregate([
            // Match only completed orders that are "delivered" and have a "paid" status
            {
                $match: {
                    allOrdersStatus: "delivered",
                    paymentStatus: "paid",
                }
            },
            // Unwind the orderedProducts array to treat each product separately
            { $unwind: "$orderedProducts" },
            // Add a new field `month` that extracts the month from the `createdAt` field
            {
                $addFields: {
                    month: { $month: "$createdAt" }
                }
            },
            // Group by month and sum the totalPay field of each orderedProduct
            {
                $group: {
                    _id: "$month",
                    totalRevenue: { $sum: "$orderedProducts.totalPay" }
                }
            },
            // Sort the result by month (ascending order)
            { $sort: { _id: 1 } }
        ]);


        // Prepare the result in an array format, initializing with zeros for all months.
        const salesData = new Array(12).fill(0); // Initialize an array with 12 zeros (one for each month).

        // Populate the array with the actual total revenue data
        result.forEach(item => {
            salesData[item._id - 1] = item.totalRevenue; // MongoDB months are 1-based, so subtract 1
        });

        return salesData;

    } catch (err) {
        console.error("Error fetching monthly sales revenue:", err);
        throw new Error("Error fetching monthly sales revenue");

    }
};


const generateRevenueByBrand = async () => {
    try {
        const revenueByBrand = await Order.aggregate([
            // Unwind orderedProducts to work with each product individually.
            { $unwind: '$orderedProducts' },
            // Lookup the Product collection to join with the orderedProducts.
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedProducts.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            // Add a new field 'revenue' that calculates total revenue for this product
            {
                $addFields: {
                    revenue: {
                        $multiply: [
                            '$orderedProducts.discountedPrice',
                            '$orderedProducts.quantity'
                        ]
                    }
                }
            },
            // Group by the brand and sum the revenues
            {
                $group: {
                    _id: '$productDetails.brand',
                    totalRevenue: { $sum: '$revenue' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            // { $limit: 5 }
        ]);

        return revenueByBrand;
    } catch (err) {
        console.error("Error fetching revenue by brand:", err);
        throw new Error("Error fetching revenue by brand");
    }
}

const calculateAOV = async () => {
    try {
        const aovData = await Order.aggregate([
            // Stage 1: Add a month field based on the order's createdAt date
            {
                $project: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    orderedProducts: 1
                }
            },
            // Stage 2: Unwind the orderedProducts array to work with each product individually
            { $unwind: '$orderedProducts' },
            // Stage 3: Group by year and month to sum totalPay and count orders
            {
                $group: {
                    _id: { year: '$year', month: '$month' },
                    totalRevenue: { $sum: '$orderedProducts.totalPay' },
                    totalOrders: { $sum: 1 }
                }
            },
            // Stage 4: Calculate the Average Order Value (AOV) by dividing totalRevenue by totalOrders
            {
                $project: {
                    _id: 0,
                    month: '$_id.month',
                    year: '$_id.year',
                    totalRevenue: 1,
                    totalOrders: 1,
                    AOV: { $divide: ['$totalRevenue', '$totalOrders'] }
                }
            },
            { $sort: { year: 1, month: 1 } }
        ]);

        return aovData;
    } catch (err) {
        console.error("Error calculating AOV:", err);
        throw new Error("Error calculating AOV");
    }
};

const newCustomerRate = async () => {
    try {
        const newCustomers = await Order.aggregate([
            {
                $group: {
                    _id: '$user',
                    firstOrderDate: { $min: "$createdAt" }
                }
            },
            {
                $project: {
                    user: '$_id',
                    firstOrderMonth: { $month: '$firstOrderDate' },
                    firstOrderYear: { $year: '$firstOrderDate' }
                }
            },
            {
                $group: {
                    _id: { year: '$firstOrderYear', month: '$firstOrderMonth' },
                    newCustomer: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);

        return newCustomers;
    } catch (err) {
        console.error("Error fetching new customers :", err);
        throw new Error("Error fetching new customers ");
    }
};


const repeatCustomerRate = async () => {
    try {
        const repeatCustomers = await Order.aggregate([
            // Step 1: Group orders by user, month, and year to count how many orders each user made
            {
                $group: {
                    _id: {
                        user: '$user',
                        month: { $month: "$createdAt" },
                        year: { $year: '$createdAt' }
                    },
                    orderCount: { $sum: 1 }
                }
            },
            // Step 2: Match users who made more than one order (repeat customers)
            {
                $match: {
                    orderCount: { $gt: 1 } // Only users who have more than one order
                }
            },
            // Step 3: Group by month and year to count the number of repeat customers
            {
                $group: {
                    _id: { year: "$_id.year", month: "$_id.month" },
                    repeatCustomerCount: { $sum: 1 } // Count repeat customers for that month/year
                }
            },
            // Step 4: Group by month and year to get the total number of orders
            {
                $group: {
                    _id: { year: "$_id.year", month: "$_id.month" },
                    repeatCustomerCount: { $first: "$repeatCustomerCount" },
                    totalOrderCount: { $sum: 1 } // Count all orders in that month/year
                }
            },
            // Step 5: Calculate the repeat customer rate
            {
                $project: {
                    repeatRate: {
                        $multiply: [
                            { $divide: ["$repeatCustomerCount", "$totalOrderCount"] }, // Divide repeat customers by total orders
                            100
                        ]
                    },
                    year: "$_id.year",
                    month: "$_id.month"
                }
            },
            // Step 6: Sort by year and month
            {
                $sort: { "year": 1, "month": 1 }
            }
        ]);
        return repeatCustomers;

    } catch (err) {
        console.error("Error fetching repeated customers :", err);
        throw new Error("Error fetching repeated customers ");
    }
};

const customerLifetimeValue = async () => {
    try {
        const clv = await Order.aggregate([
            { $unwind: '$orderedProducts' },
            {
                $group: {
                    _id: "$user",
                    totalSpent: { $sum: "$orderedProducts.totalPay" }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalSpent" },
                    totalCustomers: { $sum: 1 }
                }
            },
            {
                $project: {
                    clv: { $divide: ["$totalRevenue", "$totalCustomers"] }  // Calculate the average revenue per customer
                }
            }
        ]);
        return clv;
    } catch (err) {
        console.error("Error fetching customer lifetime value :", err);
        throw new Error("Error fetching customer lifetime value ");
    }
};

const topSellingProducts = async () => {
    try {
        const topProducts = await Order.aggregate([
            {
                $unwind: '$orderedProducts'
            },
            {
                $group: {
                    _id: '$orderedProducts.product',
                    totalQuantitySold: { $sum: '$orderedProducts.quantity' }
                }
            },
            {
                $sort: { totalQuantitySold: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'products',
                    localField: "_id",
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$productDetails'
            },
            {
                $project: {
                    _id: 0,
                    productName: '$productDetails.productName',
                    quantity: '$totalQuantitySold'
                }
            }
        ]);

        return topProducts;
    } catch (err) {
        console.error("Error fetching top products :", err);
        throw new Error("Error fetching top products ");
    }
};

const getStockStatus = async () => {
    try {
        const result = await Product.aggregate([
            // Step 1: Unwind the variants array to treat each variant as a separate document
            {
                $unwind: "$variants"
            },
            // Step 2: Group by size to calculate the total stock for each size (S, M, L, XL, XXL, XXXL)
            {
                $group: {
                    _id: "$variants.size",  // Group by size
                    totalStock: { $sum: "$variants.stock" }  // Sum stock for each size
                }
            },
            // Step 3: Sort by size (optional, to keep it in a specific order)
            {
                $sort: {
                    "_id": 1  // Sort sizes in ascending order (S, M, L, XL, XXL, XXXL)
                }
            }
        ]);

        return result;  // Returns an array of stock counts for each size

    } catch (err) {
        console.error("Error fetching size stock data:", err);
        throw new Error("Error fetching size stock data");
    }
};


const fetchOrders = async (limit, page) => {

    const filter = {
        $or: [
            {
                $nor: [
                    {
                        $and: [
                            { allOrdersStatus: 'delivered' },
                            { paymentStatus: 'paid' }
                        ]
                    }
                ]
            },
            { 'orderedProducts.returnStatus': 'requested' }
        ]
    };

    const orders = await Order.find(filter)
        .populate('user')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

    const totalOrders = await Order.countDocuments(filter);

    return { orders, totalOrders };
};


//render the dashboard.
const getDashboard = async (req, res) => {
    try {

        if (!req.session.admin) return res.redirect('/admin/signIn');

        const repeatedCustomer = await repeatCustomerRate();
        const revenueByBrand = await generateRevenueByBrand();
        const topProducts = await topSellingProducts();
        const newCustomer = await newCustomerRate();
        const salesData = await getMonthlySalesRevenue();
        const aovData = await calculateAOV();
        const clvData = await customerLifetimeValue();
        const stock = await getStockStatus();

        const limit = parseInt(req.query.limit) || 10;
        const page = parseInt(req.query.page) || 1;

        const { orders, totalOrders } = await fetchOrders(limit, page);

        res.render('admin/dashboard', {
            repeatedCustomer,
            revenueByBrand,
            newCustomer,
            topProducts,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            salesData,
            aovData,
            clvData,
            orders,
            limit,
            stock,
        });

    } catch (err) {
        console.error(`Error caught dashboard in admin controller ${err}`);
        res.status(500).json({
            error: err.message,
            message: 'Internal Server Error',
            stack: err.stack
        });
    }
};

module.exports = {
    getDashboard
}
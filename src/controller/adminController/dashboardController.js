const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const Order = require('../../model/orderModel');


const getMonthlySalesRevenue = async () => {
    try {
        const result = await Order.aggregate([
            {
                $match: {
                    status: "delivered",
                }
            },
            { $unwind: "$items" },
            {
                $addFields: {
                    month: { $month: "$createdAt" },
                    revenue: { $multiply: ["$items.finalPrice", "$items.quantity"] }
                }
            },
            {
                $group: {
                    _id: "$month",
                    totalRevenue: { $sum: "$revenue" }
                }
            },
            { $sort: { _id: 1 } }
        ]);


        const salesData = new Array(12).fill(0);
        result.forEach(item => {
            salesData[item._id - 1] = item.totalRevenue;
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
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $addFields: {
                    revenue: {
                        $multiply: [
                            '$items.finalPrice',
                            '$items.quantity'
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: '$productDetails.brand',
                    totalRevenue: { $sum: '$revenue' }
                }
            },
            { $sort: { totalRevenue: -1 } },
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
            {
                $project: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    items: 1
                }
            },
            { $unwind: '$items' },
            {
                $addFields: {
                    revenue: { $multiply: ['$items.finalPrice', '$items.quantity'] }
                }
            },
            {
                $group: {
                    _id: { year: '$year', month: '$month' },
                    totalRevenue: { $sum: '$revenue' },
                    totalOrders: { $sum: 1 }
                }
            },
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
            {
                $match: {
                    orderCount: { $gt: 1 }
                }
            },
            {
                $group: {
                    _id: { year: "$_id.year", month: "$_id.month" },
                    repeatCustomerCount: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: { year: "$_id.year", month: "$_id.month" },
                    repeatCustomerCount: { $first: "$repeatCustomerCount" },
                    totalOrderCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    repeatRate: {
                        $multiply: [
                            { $divide: ["$repeatCustomerCount", "$totalOrderCount"] },
                            100
                        ]
                    },
                    year: "$_id.year",
                    month: "$_id.month"
                }
            },
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
            { $unwind: '$items' },
            {
                $addFields: {
                    revenue: { $multiply: ['$items.finalPrice', '$items.quantity'] }
                }
            },
            {
                $group: {
                    _id: "$user",
                    totalSpent: { $sum: "$revenue" }
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
                    clv: { $divide: ["$totalRevenue", "$totalCustomers"] }
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
                $unwind: '$items'
            },
            {
                $group: {
                    _id: '$items.productId',
                    totalQuantitySold: { $sum: '$items.quantity' }
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

const getOrdersByStatus = async () => {
    try {
        return await Order.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
    } catch (err) {
        console.error("Error fetching orders by status:", err);
        throw new Error("Error fetching orders by status");
    }
};

const getPaymentMethodSplit = async () => {
    try {
        return await Order.aggregate([
            { $group: { _id: "$payment.method", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
    } catch (err) {
        console.error("Error fetching payment method split:", err);
        throw new Error("Error fetching payment method split");
    }
};

const getMonthlyOrderCount = async () => {
    try {
        const result = await Order.aggregate([
            {
                $addFields: { month: { $month: "$createdAt" } }
            },
            {
                $group: { _id: "$month", count: { $sum: 1 } }
            },
            { $sort: { _id: 1 } }
        ]);

        const orderCounts = new Array(12).fill(0);
        result.forEach(item => {
            orderCounts[item._id - 1] = item.count;
        });
        return orderCounts;
    } catch (err) {
        console.error("Error fetching monthly order count:", err);
        throw new Error("Error fetching monthly order count");
    }
};

const getDashboard = async (req, res) => {
    try {

        const repeatedCustomer = await repeatCustomerRate();
        const revenueByBrand = await generateRevenueByBrand();
        const topProducts = await topSellingProducts();
        const newCustomer = await newCustomerRate();
        const salesData = await getMonthlySalesRevenue();
        const aovData = await calculateAOV();
        const clvData = await customerLifetimeValue();
        const ordersByStatus = await getOrdersByStatus();
        const paymentMethodSplit = await getPaymentMethodSplit();
        const monthlyOrderCount = await getMonthlyOrderCount();

        res.render('admin/dashboard', {
            layout: 'admin/layout',
            title: 'Dashboard',
            repeatedCustomer,
            revenueByBrand,
            newCustomer,
            topProducts,
            salesData,
            aovData,
            clvData,
            ordersByStatus,
            paymentMethodSplit,
            monthlyOrderCount,
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

module.exports = {
    getDashboard
}
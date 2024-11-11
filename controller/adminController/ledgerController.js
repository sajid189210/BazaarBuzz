const Order = require('../../model/orderModel');


const renderLedger = async (req, res) => {

    const orders = await Order.find();

    const ordersPaidUsingRazorPay = orders.filter(item => item.paymentMethod === 'razorpay');
    console.log('ordersPaidUsingRazorPay: ',ordersPaidUsingRazorPay.length);
    

};

module.exports = {
    renderLedger
}
const razorpay = require('razorpay');
require('dotenv').config()

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

console.log(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET )

const razorpayInstance = new razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
});

module.exports = razorpayInstance;
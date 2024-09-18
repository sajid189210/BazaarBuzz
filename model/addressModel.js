const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    contactName: { type: String },
    phoneNumber: { type: Number },
    building: { type: String, },
    landmark: { type: String },
    street: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String, },
    zipcode: { type: String },
});

module.exports = addressSchema;
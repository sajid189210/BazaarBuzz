const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    contactNumber: { type: Number },
    contactName: { type: String },
    building: { type: String, },
    district: { type: String, },
    landmark: { type: String },
    pincode: { type: String },
    street: { type: String },
    state: { type: String },
});

module.exports = addressSchema;
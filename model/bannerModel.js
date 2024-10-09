const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    title: { type: String },
    type: { type: String },
    images: [{ type: String }],
    isActive: { type: Boolean }
});
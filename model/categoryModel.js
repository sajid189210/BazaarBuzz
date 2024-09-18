const mongoose = require( 'mongoose' );

//category schema.
const categorySchema = new mongoose.Schema({
    title: {
        type: String,
        unique: true,
        required: true
    },
    brands: {
        type: [String],
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true
    }
    // product_id: {
    //     type: Schema.Types.ObjectId,
    //     ref: "product"
    // }
});

const Category = mongoose.model( "Category", categorySchema );

module.exports = Category;
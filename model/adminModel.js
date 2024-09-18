const mongoose = require ( 'mongoose' );

//Admin schema
const adminSchema = new mongoose.Schema( {
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
} );

//Admin model
const adminModel = mongoose.model( "admins", adminSchema );

module.exports = adminModel;
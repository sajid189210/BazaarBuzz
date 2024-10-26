const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

require('dotenv').config();

// try {
//     // Setting Cloudinary configuration
//     cloudinary.config({
//         cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//         api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
//         api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET
//     });
// } catch (err) {
//     console.error('Error configuring Cloudinary:', err.message);
//     throw err;
// }

// // Define Cloudinary storage
// const storage = new CloudinaryStorage({
//     cloudinary: cloudinary,
//     params: {
//         folder: 'product_images',
//         format: async (req, file) => {
//             console.log(file)
//             const filetypes = /jpeg|jpg|png|gif|webp/;
//             const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//             const mimetype = filetypes.test(file.mimetype);

//             if (!extname || !mimetype) {
//                 throw new Error('Only images (jpeg, jpg, png, gif, webp) are allowed!');
//             }

//             return extname;
//         }
//     }
// });  

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up multer storage to upload images directly to Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'products_images', // Cloudinary folder where images will be stored
        format: async () => 'jpeg', // Convert all images to JPEG
    },
});


module.exports = {
    cloudinary,
    storage,
    // upload
};

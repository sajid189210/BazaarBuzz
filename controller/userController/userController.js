const { body, validationResult } = require('express-validator');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const bcrypt = require('bcrypt');
const User = require('../../model/userModel');
const OTP = require('../../model/otpModel');

//-------------------------------------------------Sign Up Page----------------------------------------------------------------------

//*-------------User sign Up validation---------------------
const userSignUpValidation = async (req, res, next) => {
    try {
        const checkExistingUser = await User.findOne({ email: req.body.email });

        if (checkExistingUser) {
            req.session.userAuthErrorMessages = 'Email is already taken.';
            return res.json({
                success: false,
                redirectUrl: '/user/signUp'
            });
        }

        const details = {
            username: req.body.username,
            email: req.body.email,
            password: bcrypt.hashSync(req.body.password, 10),
        }

        try {
            const newUser = new User(details);
            await newUser.save();
        } catch (err) {
            throw new Error("Error caught while saving new user to db.");
        }

        const user = await User.findOne({ email: req.body.email })

        req.session.user = {
            userId: user._id,
            userEmail: user.email,
            userName: user.username
        };

        res.status(201).json({
            success: true,
            redirectUrl: '/user/homepage'
        });

    } catch (err) {
        console.error(`Error caught userSignUpValidation in the userController. ${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
}


//*------------Rendering user sign up page--------------
const userSignUp = (req, res) => {

    try {
        if (req.session.user) return res.redirect('/user/homepage');
        const authErrors = req.session.userAuthErrorMessages || '';

        req.session.userAuthErrorMessages = '';

        res.render('user/userSignUpPage', {
            authErrors
        });

    } catch (err) {
        console.error(`Error caught userSignUp in the userController. ${err}`);
        res.status(500).json({ Error: "Internal Server Error!" });
    }
}

//-----------------------------------------------------------Sign In Page--------------------------------------------------------


//*-------------sign in validation-----------------------
const userSignInValidation = async (req, res) => {
    try {

        if (!req.body.email || !req.body.password) throw new Error("All fields must be filled.");

        const user = await User.findOne({ email: req.body.email });

        if (!user) throw new Error("User not found");

        if (user.isBlocked === 'blocked') throw new Error("You are blocked by the admin.");

        if (user.googleId) {
            throw new Error("Login failed. Please ensure you are using the correct method. If you signed up with Google, please log in using the Google option.");
        }

        const isMatchPassword = await bcrypt.compare(req.body.password, user.password);
        if (!isMatchPassword) throw new Error("Invalid password");

        req.session.user = {
            userId: user._id,
            userEmail: user.email,
            userName: user.username
        };

        return res.redirect('/user/homepage');

    } catch (err) {
        console.error(`Error caught userSignInValidation in the userController. ${err.message}`);
        req.session.signInAuthErrorMessages = err.message;
        return res.redirect('/user/signIn');
    }
};

//* ---------------Update Password---------------------------
const updatePassword = async (req, res) => {
    const { newInput, email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({
            success: false,
            message: 'Provide a valid email.'
        });

        const hashedPassword = await bcrypt.hash(newInput, 10);

        await User.updateOne(
            { email },
            { $set: { password: hashedPassword } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Password Updated Successfully'
        });

    } catch (err) {
        console.error(`Error caught updatePassword in the userController. ${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


//*---------rendering user sign in page---------------------------
const userSignIn = (req, res) => {
    try {

        if (req.session.user) return res.redirect('/user/homepage');

        const authErrors = req.session.signInAuthErrorMessages || '';

        req.session.signInAuthErrorMessages = null;

        res.render('user/userSignInPage', { authErrors });
    } catch (err) {
        console.error(`Error caught userSignIn in the userController. ${err}`);
        res.status(500).json({ Error: "Internal Server Error!" });
    }
};

//-----------------------------User Homepage-------------------------------

// ? getting category from the database.
const getCategory = async () => {
    try {
        return await Category.find({ isActive: true });
    } catch (err) {
        throw new Error("Error caught while getting categories from db.", err);
    }
};

// ? getting product from the database.
const getProduct = async () => {
    try {
        return await Product.find({ isActive: true, isDeleted: false }).populate({
            path: 'categoryId',
            match: { isActive: true },
            model: 'Category',
        });
    } catch (err) {
        throw new Error("Error caught while getting products from db.", err);
    }
}

//*-------------[Rendering User Homepage]--------------------------
const userHomepage = async (req, res) => {
    try {

        const categories = await getCategory();

        const products = await getProduct();

        const filteredProducts = products.filter(product => {
            return product.categoryId !== null;
        });

            // let allProducts = {};

            // for (let i = 0; i <= categories.length; i++) {
            //     for (let j = 0; i < filteredProducts.length; j++) {
            //         if (categories[i]._id.toString() === filteredProducts[j.categoryId.toString()]) {
            //             if(allproduct)
            //         }
            //     }
            // }

        return res.render('user/userHomepage', {
            user: req.session.user || null,
            categories,
            products: filteredProducts
        });

    } catch (err) {
        console.error(`Error caught userHomepage in the userController. ${err}`);
        res.status(500).json({ Error: "Internal Server Error!" });
    }
};

//*--------------[Search] ---------------
const searchProduct = async (req, res) => {
    try {

        const { search } = req.query || '';

        const regex = new RegExp(search, 'i');

        const products = await Product.find({ productName: regex });

        res.json({ products });

    } catch (err) {
        console.error(`Error caught searchProduct in the userController. ${err}`);
        res.status(500).json({
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


//*---------------[SignOut]----------------
const userSignOut = (req, res) => {
    try {

        req.session.destroy();
        res.redirect('/user/signIn');

    } catch (err) {
        console.error(`Error caught userSignOut in the userController. ${err}`);
        res.status(500).json({ Error: "Internal Server Error!" });
    }
};

module.exports = {
    userSignUpValidation,
    userSignInValidation,
    updatePassword,
    searchProduct,
    userHomepage,
    userSignOut,
    userSignIn,
    userSignUp,
}
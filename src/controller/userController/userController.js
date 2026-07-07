const response = require('../../Services/responseMapper');
const { body, validationResult } = require('express-validator');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const bcrypt = require('bcryptjs');
const Wallet = require('../../model/walletModel');
const Cart = require('../../model/userCartModel');
const User = require('../../model/userModel');
const OTP = require('../../model/otpModel');

//-------------------------------------------------Sign Up Page----------------------------------------------------------------------

//*-------------User sign Up validation---------------------
const userSignUpValidation = async (req, res, next) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Username validation: letters only, min 3 chars
        if (!username || !/^[A-Za-z]{3,}$/.test(username)) {
            return res.json({
                success: false,
                message: 'Username must contain only letters and be at least 3 characters long.'
            });
        }

        // Email validation: basic format
        if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            return res.json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        // Password validation: min 8 chars, at least 1 number, 1 special char
        if (!password || !/^(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
            return res.json({
                success: false,
                message: 'Password must be at least 8 characters long and contain at least one number and one special character (@$!%*?&).'
            });
        }

        // Confirm password match
        if (password !== confirmPassword) {
            return res.json({
                success: false,
                message: 'Passwords do not match.'
            });
        }

        // Check if email already exists
        const checkExistingUser = await User.findOne({ email: email });
        if (checkExistingUser) {
            return res.json({
                success: false,
                message: 'Email is already taken.'
            });
        }

        const details = {
            username: username,
            email: email,
            password: bcrypt.hashSync(password, 10),
        };

        try {
            const newUser = new User(details);
            await newUser.save();
        } catch (err) {
            return res.json({
                success: false,
                message: 'Error creating user. Please try again.'
            });
        }

        const user = await User.findOne({ email: email });

        req.session.user = {
            userId: user._id,
            userEmail: user.email,
            userName: user.username
        };

        response.success(res, {
            success: true,
            redirectUrl: '/'
        });

    } catch (err) {
        response.serverError(res, err);
    }
};


//*------------Rendering user sign up page--------------
const userSignUp = (req, res) => {

    try {
        if (req.session.user) return res.redirect('/');
        const authErrors = req.session.userAuthErrorMessages || '';

        req.session.userAuthErrorMessages = '';

        res.render('user/userSignUpPage', {
            authErrors
        });

    } catch (err) {
        response.serverError(res, err);}
}

//-----------------------------------------------------------Sign In Page--------------------------------------------------------


//*-------------sign in validation-----------------------
const userSignInValidation = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Email validation
        if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            return res.json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        // Password required
        if (!password) {
            return res.json({
                success: false,
                message: 'Password is required.'
            });
        }

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.json({
                success: false,
                message: 'User not found. Please check your email or sign up.'
            });
        }

        if (user.isBlocked === 'blocked') {
            return res.json({
                success: false,
                message: 'You are blocked by the admin. Please contact support.'
            });
        }

        if (user.googleId) {
            return res.json({
                success: false,
                message: 'Login failed. Please ensure you are using the correct method. If you signed up with Google, please log in using the Google option.'
            });
        }

        const isMatchPassword = await bcrypt.compare(password, user.password);
        if (!isMatchPassword) {
            return res.json({
                success: false,
                message: 'Invalid password. Please try again.'
            });
        }

        req.session.user = {
            userId: user._id,
            userEmail: user.email,
            userName: user.username
        };

        return res.redirect('/');

    } catch (err) {
        console.error(`Error caught userSignInValidation in the userController. ${err.message}`);
        return res.json({
            success: false,
            message: 'An unexpected error occurred. Please try again.'
        });
    }
};

//* ---------------Update Password---------------------------
const updatePassword = async (req, res) => {
    const { newInput, email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return response.error(res, "Provide a valid email.", 400);

        const hashedPassword = await bcrypt.hash(newInput, 10);

        await User.updateOne(
            { email },
            { $set: { password: hashedPassword } },
            { new: true }
        );

        response.success(res, {}, "Password Updated Successfully");

    } catch (err) {
        response.serverError(res, err);}
};


//*---------rendering user sign in page---------------------------
const userSignIn = (req, res) => {
    try {

        if (req.session.user) return res.redirect('/');

        const authErrors = req.session.signInAuthErrorMessages || '';

        req.session.signInAuthErrorMessages = null;

        res.render('user/userSignInPage', { authErrors });
    } catch (err) {
        response.serverError(res, err);}
};

//-----------------------------User Homepage-------------------------------

// ? getting category from the database.
const getCategory = async () => {
    try {
        return await Category.find({ isActive: { $ne: false } });
    } catch (err) {
        throw new Error("Error caught while getting categories from db.", err);
    }
};

// ? getting product from the database.
const getProduct = async () => {
    try {
        return await Product.find({ isActive: true, isDeleted: false }).sort({ createdAt: -1 });
    } catch (err) {
        throw new Error("Error caught while getting products from db.", err);
    }
};


//*-------------[Rendering User Homepage]--------------------------
const userHomepage = async (req, res) => {
    try {

        const categories = await getCategory();

        const products = await getProduct();

        const filteredProducts = products.filter(product => {
            return product.category;
        });

        if (req.session.user) {
            const userId = req.session.user.userId;
            const [cart, wallet] = await Promise.all([
                Cart.findOne({ user: userId }),
                Wallet.findOne({ user: userId })
            ]);

            if (!cart) {
                const newCart = new Cart({ user: userId });
                await newCart.save();
            }

            if (!wallet) {
                const newWallet = new Wallet({ user: userId });
                await newWallet.save();
            }
        }

        const heroMode = req.query.hero || 'image';

        return res.render('user/userHomepage', {
            user: req.session.user || null,
            categories,
            searchBox: true,
            products: filteredProducts,
            heroMode,
        });

    } catch (err) {
        response.serverError(res, err);}
};

//*--------------[Search a single product] ---------------
const searchSingleProduct = async (req, res) => {
    try {

        const { search } = req.query || '';

        const regex = new RegExp(search, 'i');

        const products = await Product.find({ productName: regex });

        response.success(res, { products });

    } catch (err) {
        response.serverError(res, err);}
};

//*--------------[Search multiple products] ---------------
const searchMultipleProducts = async (req, res) => {
    try {

        const { search } = req.query || '';

        const regex = new RegExp(search, 'i');

        const products = await Product.find({ productName: regex });

        req.session.searchResult = products;

        response.success(res, { products });

    } catch (err) {
        response.serverError(res, err);}
};



//*--------------[Render Address Page] ---------------
const getAddress = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');

        const userDetails = await User.findById(req.session.user.userId)
        const categories = await Category.find();

        res.render('user/userAddress', {
            user: req.session.user || null,
            categories,
            userDetails,
            searchBox: false
        });

    } catch (err) {
        response.serverError(res, err);}
};

//*--------------[Saves Address] ---------------
const saveAddress = async (req, res) => {
    const { formInputs } = req.body;
    const userId = req.session.user.userId;
    try {

        const user = await User.findByIdAndUpdate(userId,
            { $push: { addressId: formInputs } },
            { new: true }
        );

        if (!user) throw new Error("Error while adding new address.");

        response.success(res, {}, "You have successfully added address.");

    } catch (err) {
        response.serverError(res, err);}
};

//*--------------[Removes Address] ---------------
const removeAddress = async (req, res) => {
    const { addressId } = req.query;
    const userId = req.session.user.userId;
    try {

        if (!addressId || !userId) return response.error(res, "address or user not found", 400);

        const result = await User.updateOne(
            { _id: userId },
            { $pull: { addressId: { _id: addressId } } },
            { new: true }
        );

        if (!result.modifiedCount) {
            return response.error(res, "Address not found", 404);
        }

        response.success(res, {}, "Address Successfully removed");

    } catch (err) {
        response.serverError(res, err);}
}

//*--------------[Edit Address] ---------------
const editAddress = async (req, res) => {
    const { formInputs } = req.body;
    const userId = req.session.user.userId;
    const { addressId } = req.query;
    try {

        if (!formInputs || !userId) return response.error(res, "Form inputs or user not found.", 400);

        const result = await User.updateOne(
            { _id: userId, 'addressId._id': addressId },
            { $set: { 'addressId.$': formInputs } },
            { new: true },
        );

        if (!result.modifiedCount) {
            return response.error(res, 'Address not found', 400);
        }

        response.success(res, {}, "Address Successfully Updated.");

    } catch (err) {
        response.serverError(res, err);}
};

const renderProfile = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;

        const userDetails = await User.findById(userId);

        const categories = await getCategory();

        res.render('user/userProfile', {
            user: req.session.user || null,
            userDetails,
            searchBox: false,
            categories
        });

    } catch (err) {
        response.serverError(res, err);}
};

const updateProfile = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/user/signIn');

        const userId = req.session.user.userId;
        const { username, email, phone } = req.body;

        await User.findByIdAndUpdate(userId, { username, email, phone }, { runValidators: true });

        req.session.user.userName = username;

        response.success(res, {}, "Profile updated successfully.");

    } catch (err) {
        response.serverError(res, err);}
};

//*---------------[SignOut]----------------
const userSignOut = (req, res) => {
    try {

        req.session.destroy();
        res.redirect('/user/signIn');

    } catch (err) {
        response.serverError(res, err);}
};

module.exports = {
    searchMultipleProducts,
    userSignInValidation,
    userSignUpValidation,
    searchSingleProduct,
    updatePassword,
    removeAddress,
    renderProfile,
    updateProfile,
    userHomepage,
    saveAddress,
    editAddress,
    userSignOut,
    userSignIn,
    userSignUp,
    getAddress,
}
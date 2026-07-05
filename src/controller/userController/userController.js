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

        response.success(res, {
            success: true,
            redirectUrl: '/'
        });

    } catch (err) {
        response.serverError(res, err);}
}


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

        return res.redirect('/');

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
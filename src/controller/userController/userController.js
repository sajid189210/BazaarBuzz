const R = require('../../constants/redirects');
const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const { body, validationResult } = require('express-validator');
const Category = require('../../model/categoryModel');
const Product = require('../../model/productModel');
const bcrypt = require('bcryptjs');
const { WALLET_TYPE_USER } = require('../../constants/walletTypes');
const Wallet = require('../../model/walletModel');
const Cart = require('../../model/userCartModel');
const User = require('../../model/userModel');
const OTP = require('../../model/otpModel');

//-------------------------------------------------Sign Up Page----------------------------------------------------------------------

//*-------------User sign Up validation---------------------
const userSignUpValidation = async (req, res, next) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        if (!username || !/^[A-Za-z]{3,}$/.test(username)) {
            return res.json({ success: false, message: MSG.USERNAME_LETTERS_ONLY });
        }

        if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            return res.json({ success: false, message: MSG.VALID_EMAIL });
        }

        if (!password || !/^(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
            return res.json({ success: false, message: MSG.PASSWORD_REQUIREMENTS });
        }

        if (password !== confirmPassword) {
            return res.json({ success: false, message: MSG.PASSWORDS_MISMATCH });
        }

        const checkExistingUser = await User.findOne({ email: email });
        if (checkExistingUser) {
            return res.json({ success: false, message: MSG.EMAIL_TAKEN });
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
            return res.json({ success: false, message: MSG.ERROR_CREATING_USER });
        }

        const user = await User.findOne({ email: email });

        req.session.user = {
            userId: user._id,
            userEmail: user.email,
            userName: user.username
        };

        response.success(res, {
            success: true,
            redirectUrl: R.HOME
        });

    } catch (err) {
        response.serverError(res, err);
    }
};


//*------------Rendering user sign up page--------------
const userSignUp = (req, res) => {

    try {
        if (req.session.user) return res.redirect(R.HOME);
        const authErrors = req.session.userAuthErrorMessages || '';

        req.session.userAuthErrorMessages = '';
        
        res.locals.hideUI = true;

        res.render('user/userSignUpPage', {
            title: 'Create Account',
            authErrors
        });

    } catch (err) {
        response.serverError(res, err);
    }
}

//-----------------------------------------------------------Sign In Page--------------------------------------------------------


//*-------------sign in validation-----------------------
const userSignInValidation = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            return res.json({ success: false, message: MSG.VALID_EMAIL });
        }

        if (!password) {
            return res.json({ success: false, message: MSG.PASSWORD_REQUIRED });
        }

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.json({ success: false, message: MSG.USER_NOT_FOUND_SIGNIN });
        }

        if (user.isBlocked === 'blocked') {
            return res.json({ success: false, message: MSG.USER_BLOCKED_CONTACT });
        }

        if (user.googleId) {
            return res.json({ success: false, message: MSG.GOOGLE_LOGIN_METHOD });
        }

        const isMatchPassword = await bcrypt.compare(password, user.password);
        if (!isMatchPassword) {
            return res.json({ success: false, message: MSG.INVALID_PASSWORD });
        }

        req.session.user = {
            userId: user._id,
            userEmail: user.email,
            userName: user.username
        };

        return res.redirect(R.HOME);

    } catch (err) {
        console.error(`Error caught userSignInValidation in the userController. ${err.message}`);
        return res.json({ success: false, message: MSG.UNEXPECTED_ERROR });
    }
};

//* ---------------Update Password---------------------------
const updatePassword = async (req, res) => {
    const { newInput, email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) return response.error(res, MSG.PROVIDE_VALID_EMAIL, 400);

        const hashedPassword = await bcrypt.hash(newInput, 10);

        await User.updateOne(
            { email },
            { $set: { password: hashedPassword } },
            { new: true }
        );

        response.success(res, {}, MSG.PASSWORD_UPDATED);

    } catch (err) {
        response.serverError(res, err);
    }
};


//*---------rendering user sign in page---------------------------
const userSignIn = (req, res) => {
    try {

        if (req.session.user) return res.redirect(R.HOME);

        const authErrors = req.session.signInAuthErrorMessages || '';

        req.session.signInAuthErrorMessages = null;

        res.locals.hideUI = true;

        res.render('user/userSignInPage', { title: 'Sign In', authErrors });
    } catch (err) {
        response.serverError(res, err);
    }
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
                Wallet.findOne({ owner: userId, type: WALLET_TYPE_USER })
            ]);

            if (!cart) {
                const newCart = new Cart({ user: userId });
                await newCart.save();
            }

            if (!wallet) {
                const newWallet = new Wallet({ owner: userId, type: WALLET_TYPE_USER });
                await newWallet.save();
            }
        }

        const heroMode = req.query.hero || 'image';

        return res.render('user/userHomepage', {
            title: 'Home',
            user: req.session.user || null,
            categories,
            searchBox: true,
            products: filteredProducts,
            heroMode,
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

//*--------------[Search a single product] ---------------
const searchSingleProduct = async (req, res) => {
    try {

        const { search } = req.query || '';

        const regex = new RegExp(search, 'i');

        const products = await Product.find({ productName: regex });

        response.success(res, { products });

    } catch (err) {
        response.serverError(res, err);
    }
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
        response.serverError(res, err);
    }
};



//*--------------[Render Address Page] ---------------
const getAddress = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect(R.USER_SIGNIN);

        const userDetails = await User.findById(req.session.user.userId)
        const categories = await Category.find();

        res.render('user/userAddress', {
            title: 'My Addresses',
            user: req.session.user || null,
            categories,
            userDetails,
            searchBox: false
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

//*--------------[Get Single Address] ---------------
const getSingleAddress = async (req, res) => {
    try {
        if (!req.session.user) return response.error(res, MSG.NOT_AUTHENTICATED, 401, { session: false, redirectUrl: R.USER_SIGNIN });
        const { addressId } = req.params;
        const user = await User.findById(req.session.user.userId);
        if (!user) return response.error(res, MSG.USER_NOT_FOUND, 404);
        const address = user.addressId.id(addressId);
        if (!address) return response.error(res, MSG.ADDRESS_NOT_FOUND, 404);
        response.success(res, { address }, MSG.ADDRESS_FETCHED);
    } catch (err) {
        response.serverError(res, err);
    }
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

        response.success(res, {}, MSG.ADDRESS_ADDED);

    } catch (err) {
        response.serverError(res, err);
    }
};

//*--------------[Removes Address] ---------------
const removeAddress = async (req, res) => {
    const { addressId } = req.params;
    const userId = req.session.user.userId;
    try {

        if (!addressId || !userId) return response.error(res, MSG.ADDRESS_OR_USER_NOT_FOUND, 400);

        const result = await User.updateOne(
            { _id: userId },
            { $pull: { addressId: { _id: addressId } } }
        );

        if (!result.modifiedCount) {
            return response.error(res, MSG.ADDRESS_NOT_FOUND, 404);
        }

        response.success(res, {}, MSG.ADDRESS_REMOVED);

    } catch (err) {
        response.serverError(res, err);
    }
}

//*--------------[Edit Address] ---------------
const editAddress = async (req, res) => {
    const { formInputs } = req.body;
    const userId = req.session.user.userId;
    const { addressId } = req.params;
    try {

        if (!formInputs || !userId) return response.error(res, MSG.FORM_INPUTS_REQUIRED, 400);

        const setFields = {};
        for (const key of Object.keys(formInputs)) {
            setFields[`addressId.$.${key}`] = formInputs[key];
        }

        const result = await User.updateOne(
            { _id: userId, 'addressId._id': addressId },
            { $set: setFields }
        );

        if (!result.modifiedCount) {
            return response.error(res, MSG.ADDRESS_NOT_FOUND_EDIT, 400);
        }

        response.success(res, {}, MSG.ADDRESS_UPDATED);

    } catch (err) {
        response.serverError(res, err);
    }
};

const renderProfile = async (req, res) => {
    try {

        if (!req.session.user) return res.redirect(R.USER_SIGNIN);

        const userId = req.session.user.userId;

        const userDetails = await User.findById(userId);

        const categories = await getCategory();

        res.render('user/userProfile', {
            title: 'My Profile',
            user: req.session.user || null,
            userDetails,
            searchBox: false,
            categories
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

const updateProfile = async (req, res) => {
    try {
        if (!req.session.user) return res.redirect(R.USER_SIGNIN);

        const userId = req.session.user.userId;
        const { username, email, phone } = req.body;

        await User.findByIdAndUpdate(userId, { username, email, phone }, { runValidators: true });

        req.session.user.userName = username;

        response.success(res, {}, MSG.PROFILE_UPDATED);

    } catch (err) {
        response.serverError(res, err);
    }
};

//*---------------[SignOut]----------------
const userSignOut = (req, res) => {
    try {

        req.session.destroy();
        res.redirect(R.USER_SIGNIN);

    } catch (err) {
        response.serverError(res, err);
    }
};

//*---------------[Newsletter Subscription]----------------
const subscribeNewsletter = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            return response.error(res, MSG.VALID_EMAIL, 400);
        }

        console.log('Newsletter subscription:', email);

        return response.success(res, { message: MSG.NEWSLETTER_SUBSCRIBED });

    } catch (err) {
        response.serverError(res, err);
    }
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
    getSingleAddress,
    subscribeNewsletter,
}

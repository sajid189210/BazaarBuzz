const { body, validationResult } = require('express-validator');
const userModel = require('../../model/userModel');
const bcrypt = require('bcrypt');



//?--------user validation--------
const userValidation = {
    validateUser(req) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.session.userValidationErrorMessages = errors.array();
            return false;
        }
        return true;
    }
};


//?-----------check if the user exists----------
const existingUser = async (email) => {
    const user = await userModel.findOne({ email });
    return user;
}


//?---------------handling user session--------------
const userSession = {
    createSession(req, user) {
        req.session.user = { _id: user._id, email: user.email };
        return '/user/homepage';
    },
};


//-------------------------------------------------Sign Up Page----------------------------------------------------------------------

//?------setting validation for user sign up credentials.
const validateUserSignUpCredentials = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 20 })
        .withMessage('Username must be between 3 and 20 characters'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Must enter email.')
        .bail()
        .toLowerCase()
        .isEmail()
        .withMessage('Invalid email.'),

    body('password')
        .trim()
        .isLength({ min: 8, max: 12 })
        .withMessage('Password must be between 8 and 12 characters'),

    body('confirmPassword')
        .trim()
        .custom((value, { req }) => value === req.body.password)
        .withMessage('Passwords do not match'),
];


//?---------saving user to the db------------
const saveUser = {
    async createUser(details) {
        const newUser = new userModel(details);
        try {
            await newUser.save();
            return newUser;
        } catch (err) {
            console.error(`Error creating user: ${err.message}`);
            throw new Error('Failed to create user');
        }
    }
};


//*-------------User sign Up validation---------------------
const userSignUpValidation = async (req, res, next) => {
    try {
        const validationResult = userValidation.validateUser(req);

        if (!validationResult) return res.redirect('/user/signUp');

        const details = {
            username: req.body.username,
            email: req.body.email,
            password: bcrypt.hashSync(req.body.password, 10),
        }

        const checkExistingUser = await existingUser(req.body.email);

        if (checkExistingUser) throw new Error("Email already exist");

        const newUser = await saveUser.createUser(details);

        const redirectUrl = userSession.createSession(req, newUser);

        res.redirect(redirectUrl);

    } catch (err) {
        console.error(`Error caught userSignUpValidation in the userController. ${err}`);
        req.session.userAuthErrorMessages = err.message;
        res.redirect('/user/signUp');
    }
}


//*------------Rendering user sign up page--------------
const userSignUp = (req, res) => {

    try {
        if (req.session.user) return res.redirect('/user/homepage');
        const errors = req.session.userValidationErrorMessages || [];
        const authErrors = req.session.userAuthErrorMessages || '';

        req.session.userValidationErrorMessages = null;
        req.session.userAuthErrorMessages = null;


        res.render('user/userSignUpPage', {
            errors,
            authErrors
        });

    } catch (err) {
        console.error(`Error caught userSignUp in the userController. ${err}`);
        res.status(500).json({ Error: "Internal Server Error!" });
    }
}

//-----------------------------------------------------------Sign In Page--------------------------------------------------------

//?------setting validation for user sign in credentials.
const validateUserSignInCredentials = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Must enter email.'),

    body('password')
        .trim()
        .isLength({ min: 8, max: 12 })
        .withMessage('Password must be between 8 and 12 characters')
];


//?---------authenticate user------------
const userAuth = {
    async authenticate(email, password) {
        const user = await userModel.findOne({ email });
        if (!user) throw new Error("User not found");

        const isMatchPassword = await bcrypt.compare(password, user.password);
        if (!isMatchPassword) throw new Error("Invalid password");

        return user;
    },
};


//*-------------sign in validation-----------------------
const userSignInValidation = async (req, res) => {
    try {

        const validationResult = userValidation.validateUser(req);

        if (!validationResult) return res.redirect('/user/signIn');

        const user = await userAuth.authenticate(req.body.email, req.body.password);

        const redirectUrl = userSession.createSession(req, user);

        return res.redirect(redirectUrl);

    } catch (err) {
        console.error(`Error caught userSignInValidation in the userController. ${err.message}`);
        req.session.signInAuthErrorMessages = err.message;
        return res.redirect('/user/signIn');
    }
}


//*---------rendering user sign in page---------------------------
const userSignIn = (req, res) => {
    try {
        if (req.session.user) return res.redirect('/user/homepage');

        const validErrors = req.session.userValidationErrorMessages || [];
        const authErrors = req.session.userAuthErrorMessages || '';

        req.session.userValidationErrorMessages = null;
        req.session.userAuthErrorMessages = null;


        res.render('user/userSignInPage', { validErrors, authErrors });
    } catch (err) {
        console.error(`Error caught userSignIn in the userController. ${err}`);
        res.status(500).json({ Error: "Internal Server Error!" });
    }
}

//-----------------------------User Homepage-------------------------------

//*-------------rendering user homepage.--------------------------
const userHomepage = (req, res) => {
    try {

        if (req.session.user) return res.render('user/userHomepage');
        else res.redirect('/user/signIn');

    } catch (err) {
        console.error(`Error caught userHomepage in the userController. ${err}`);
        res.status(500).json({ Error: "Internal Server Error!" });
    }
}

//*---------------signOut----------------
const userSignOut = (req, res) => {
    try {

        req.session.destroy();
        res.redirect('/user/signIn');

    } catch (err) {
        console.error(`Error caught userSignOut in the userController. ${err}`);
        res.status(500).json({ Error: "Internal Server Error!" });
    }
}

module.exports = {
    userSignUp,
    userSignUpValidation,
    validateUserSignUpCredentials,
    userSignIn,
    validateUserSignInCredentials,
    userSignInValidation,
    userHomepage,
    userSignOut,
}
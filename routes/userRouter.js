const router = require('express').Router();
const userController = require('../controller/userController/userController');
const auth = require('../Services/googleAuth');


//*--------------User Sign Up -----------------

router.get("/signUp", userController.userSignUp);

router.post("/signUp", userController.validateUserSignUpCredentials, userController.userSignUpValidation);



//*---------------User Sign In--------------------

router.get('/signIn', userController.userSignIn);

router.post('/signIn', userController.validateUserSignInCredentials, userController.userSignInValidation);



//*-------------------User Home Page----------------

router.get('/homepage', userController.userHomepage);


//*------------------User SignOut----------------
router.get('/signOut', userController.userSignOut);




module.exports = router;          
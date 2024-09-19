const router = require('express').Router();
const userController = require('../controller/userController/userController');
const auth = require('../Services/googleAuth');
const otp = require('../controller/userController/otpVerification');


//*--------------User Sign Up -----------------
router.get("/signUp", userController.userSignUp);
router.post("/signUp", userController.validateUserSignUpCredentials, userController.userSignUpValidation);

//*---------------User Sign In--------------------
router.get('/signIn', userController.userSignIn);
router.post('/signIn', userController.validateUserSignInCredentials, userController.userSignInValidation);

//*-------forgot password OTP verification---------
router.post('/otpRequest', otp.requestOTP);
router.post('/otpVerify', otp.verifyOTP);
router.delete('/otpExpiry', otp.handleOtpExpiry);

//*-------------------User Home Page----------------
router.get('/homepage', userController.userHomepage);

//*------------------User SignOut----------------
router.get('/signOut', userController.userSignOut);




module.exports = router;
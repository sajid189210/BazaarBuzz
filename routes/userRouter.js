const productViewController = require('../controller/userController/productViewController');
const userController = require('../controller/userController/userController');
const otpController = require('../controller/userController/otpVerification');
const userCart = require('../controller/userController/cartController');
const router = require('express').Router();
const auth = require('../Services/googleAuth');

//*--------------[User Sign Up]-----------------
router.get("/signUp", userController.userSignUp);
router.post("/signUp", userController.userSignUpValidation);

//*---------------[User Sign In]--------------------
router.get('/signIn', userController.userSignIn);
router.post('/signIn', userController.userSignInValidation);
router.put('/updatePassword', userController.updatePassword);

//*-------[OTP verification]---------------
router.post('/otpRequest', otpController.requestOTP);
router.post('/otpVerify', otpController.verifyOTP);
router.delete('/otpExpiry', otpController.handleOtpExpiry);

//*-------------------[User Home Page-]---------------
router.get('/homepage', userController.userHomepage);
router.get('/search', userController.searchProduct);

//*-------------------[View Product Page]----------------
router.get('/viewProduct', productViewController.viewProduct);

//*--------------------[Cart List]-----------------------
router.get('/cart', userCart.getCart);
router.put('/cart', userCart.addToCart);
router.patch('/cart/updateQuantity', userCart.updateQuantity);
router.delete('/cart/removeItem', userCart.removeItem);

//*------------------[User Sign Out]----------------
router.get('/signOut', userController.userSignOut);




module.exports = router;
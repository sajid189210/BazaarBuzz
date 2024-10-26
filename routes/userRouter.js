const productViewController = require('../controller/userController/productViewController');
const productListController = require('../controller/userController/userProductListController');
const checkoutController = require('../controller/userController/checkoutController');
// const wishlistController = require('../controller/userController/wishlistController');
const orderController = require('../controller/userController/userOrderController');
const cartController = require('../controller/userController/cartController');
const userController = require('../controller/userController/userController');
const otpController = require('../controller/userController/otpVerification');
const router = require('express').Router();

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
router.get('/address', userController.getAddress);
router.post('/address', userController.saveAddress);
router.put('/address', userController.editAddress);
router.delete('/address', userController.removeAddress);

//*-------------------[View Product Page]----------------
router.get('/viewProduct', productViewController.viewProduct);

//*-------------------[Product List Page]----------------
router.get('/getProductList/:id', productListController.renderProductList);
router.get('/filterProductList/:id', productListController.filterProductsList);

//*--------------------[Cart List]-----------------------
router.get('/cart', cartController.getCart);
router.put('/cart', cartController.addToCart);
router.patch('/cart/updateQuantity', cartController.updateQuantity);
router.delete('/cart/removeItem', cartController.removeItem);   

//*--------------------[Cart List]-----------------------
// router.get('/wishlist', wishlistController)

//*--------------------[Checkout]-----------------------
router.get('/checkout', checkoutController.getCheckout);
router.get('/orderSummary', checkoutController.getOrderSummary);
router.post('/checkout/payment', checkoutController.proceedToPayment);

//*--------------------[Orders]-----------------------
router.get('/orders', orderController.getOrders);
router.patch('/orders/return', orderController.returnProduct);

//*------------------[User Sign Out]----------------
router.get('/signOut', userController.userSignOut);

//*------------------[User Common Routes]----------------
router.get('/search', userController.searchSingleProduct);
router.get('/search/list', userController.searchMultipleProducts);

module.exports = router;
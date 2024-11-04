const productViewController = require('../controller/userController/productViewController');
const productListController = require('../controller/userController/userProductListController');
const checkoutController = require('../controller/userController/checkoutController');
const wishlistController = require('../controller/userController/wishlistController');
const walletController = require('../controller/userController/walletController');
const orderController = require('../controller/userController/userOrderController');
const cartController = require('../controller/userController/cartController');
const userController = require('../controller/userController/userController');
const otpController = require('../controller/userController/otpVerification');
const { check } = require('express-validator');
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
router.get('/profile', userController.renderProfile);

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

//*--------------------[Wishlist]-----------------------
router.get('/wishlist', wishlistController.renderWishlist);
router.put('/wishlist', wishlistController.addToWishList);
router.put('/removeList', wishlistController.removeProduct);

//*--------------------[Checkout]-----------------------
router.get('/checkout', checkoutController.getCheckout);
router.get('/checkout/orderSummary', checkoutController.getOrderSummary);
router.post('/checkout/payment', checkoutController.proceedToPayment);
router.post('/checkout/verify', checkoutController.verifyPayment);
router.put('/checkout/applyCoupon', checkoutController.applyCoupon);

//*--------------------[Orders]-----------------------
router.get('/orders', orderController.getOrders);
router.patch('/orders/return', orderController.returnProduct);
router.patch('/orders/cancel', orderController.cancelProduct);

//*--------------------[Wallet]-----------------------
router.get('/wallet', walletController.renderWallet);
router.patch('/wallet/createRazorpayOrder', walletController.createRazorpayOrder);

//*------------------[User Sign Out]----------------
router.get('/signOut', userController.userSignOut);

//*------------------[User Common Routes]----------------
router.get('/search', userController.searchSingleProduct);
router.get('/search/list', userController.searchMultipleProducts);

module.exports = router;        
const router = require('express').Router();
const salesReportController = require('../controller/adminController/salesReportController');
const categoryController = require("../controller/adminController/categoryController");
const productManagement = require('../controller/adminController/productController');
const bannerController = require('../controller/adminController/bannerController');
const couponController = require('../controller/adminController/couponController');
const adminController = require("../controller/adminController/adminController");
const orderController = require('../controller/adminController/orderController');
const userManagement = require('../controller/adminController/userManagementController');

const { storage } = require('../Services/uploads');
const multer = require('multer');
const upload = multer({ storage });


//*------------------[Admin]----------------------
router.get("/signIn", adminController.adminSignIn);

router.get("/signOut", adminController.adminSignOut);

router.get("/dashboard", adminController.dashboard);

router.get("/changePassword", adminController.adminChangePassword)

router.post("/signIn", adminController.validateCredentials);

router.post("/changePassword", adminController.validateChangePassword);


//*--------------------[Category]----------------
router.get("/category", categoryController.adminCategory);

router.post("/category/create", categoryController.createCategory);

router.put("/categoryStatus/:id", categoryController.changeCategoryStatus);

router.patch("/category/update", categoryController.updateCategory);

router.delete("/category/delete/:id", categoryController.deleteCategory);


//*---------------[User Management]-------------------------
router.get('/userList/', userManagement.userManagementPage);

router.post('/search', userManagement.searchUser);

router.put('/userList/blocked/:id', userManagement.blockUser);

router.put('/userList/unblocked/:id', userManagement.unBlockUser);


//*------------------[Product Management]--------------------
router.get('/productList', productManagement.getProducts);

router.get('/fetchCategory/:id', productManagement.getCategory);

router.get('/productList/create', productManagement.getCreateProducts);

router.get('/searchProduct', productManagement.searchProduct);

router.get('/removeProduct', productManagement.removeProduct);

router.post('/productList/create', productManagement.createProducts);

router.post('/uploadImage', upload.single('croppedImage'), productManagement.extractFilePath);

router.put('/status', productManagement.isActive);

router.put('/productList/update', productManagement.productUpdate);

//*------------------[Order Management]--------------------
router.get('/orders', orderController.renderOrderList);
router.get('/order/view', orderController.renderOrderView);
router.patch('/order/changeStatus', orderController.changeStatus);
router.patch('/order/returns', orderController.returnStatus);
router.patch('/order/refund', orderController.refund);

//*------------------[Coupon Management]--------------------
router.get('/coupon', couponController.renderCouponPage);
router.post('/coupon', couponController.createCoupons);
router.put('/coupon', couponController.updateCoupons);
router.delete('/coupon', couponController.deleteCoupons);

//*------------------[Sales Report]--------------------
router.get('/salesReport', salesReportController.renderReport);
router.post('/downloadReport', salesReportController.downloadReport)

//*------------------[Banner]--------------------
router.get('/banner', bannerController.getBannerPage);


//*------------[common route]s------------------
// router.get('/productList/category/:id', )

module.exports = router;
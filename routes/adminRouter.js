const router = require('express').Router();
const adminController = require("../controller/adminController/adminController");
const categoryController = require("../controller/adminController/categoryController");
const userManagement = require('../controller/adminController/userManagementController');
const productManagement = require('../controller/adminController/productController');
const bannerController = require('../controller/adminController/bannerController');

// const multer = require('multer');
// // const { cloudinary, storage, upload } = require('../Services/uploads');
// const { storage } = require('../Services/uploads');
// const upload = multer({ storage });

const { storage } = require('../Services/uploads');
const multer = require('multer');
const upload = multer({ storage });



//*------------------[Admin]----------------------
router.get("/signIn", adminController.adminSignIn);

router.post("/signIn", adminController.validateCredentials);

router.get("/dashboard", adminController.dashboard);

router.get("/changePassword", adminController.adminChangePassword)

router.post("/changePassword", adminController.validateChangePassword);

router.post("/signOut", adminController.adminSignOut);


//*--------------------[Category]----------------
router.get("/category", categoryController.adminCategory);

router.post("/category/create", categoryController.createCategory);

router.patch("/category/update", categoryController.updateCategory);

router.delete("/category/delete/:id", categoryController.deleteCategory);

router.put("/categoryStatus/:id", categoryController.changeCategoryStatus);


//*---------------[User Management]-------------------------
router.get('/userList/', userManagement.userManagementPage);

router.put('/userList/unblocked/:id', userManagement.unBlockUser);

router.put('/userList/blocked/:id', userManagement.blockUser);

router.post('/search', userManagement.searchUser);


//*------------------[Product Management]--------------------
router.get('/productList', productManagement.getProducts);

router.get('/fetchCategory/:id', productManagement.getCategory);

router.get('/productList/create', productManagement.getCreateProducts);

router.post('/productList/create', productManagement.createProducts);

router.post('/uploadImage', upload.single('croppedImage'), productManagement.extractFilePath);

router.patch('/productList/update/:id', productManagement.productUpdate);

router.put('/status', productManagement.isActive);

router.get('/searchProduct', productManagement.searchProduct);

router.get('/removeProduct', productManagement.removeProduct);


//*------------------[Banner]--------------------
router.get('/banner', bannerController.getBannerPage);


//*------------[common route]s------------------
// router.get('/productList/category/:id', )

module.exports = router;
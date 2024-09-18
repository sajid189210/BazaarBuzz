const router = require('express').Router();
const adminController = require("../controller/adminController/adminController");
const categoryController = require("../controller/adminController/categoryController");
const userManagement = require('../controller/adminController/userManagementController');
const productManagement = require('../controller/adminController/productController');



//*------------------Admin----------------------
router.get("/signIn", adminController.adminSignIn);

router.get("/dashboard", adminController.dashboard);

router.get("/changePassword", adminController.adminChangePassword)

router.post("/signIn", adminController.validateCredentials);

router.post("/changePassword", adminController.validateChangePassword);

router.post("/signOut", adminController.adminSignOut);


//*--------------------Category----------------
router.get("/category", categoryController.adminCategory);

router.post("/category/create", categoryController.createCategory);

router.patch("/category/update/:id", categoryController.updateCategory);

// router.delete("/category/delete/:id", categoryController.deleteCategory);

router.put("/categoryStatus/:id", categoryController.changeCategoryStatus);


//*---------------User Management-------------------------
router.get('/userList', userManagement.userManagementPage);

router.put('/userList/unblocked/:id', userManagement.unBlockUser);

router.put('/userList/blocked/:id', userManagement.blockUser);

//*------------------Product Management--------------------
router.get('/productList', productManagement.listProducts);

router.get('/productList/create', productManagement.getCreateProducts);

router.post('/productList/create', productManagement.postCreateProducts);

// router.get('/productList/create/:id', productManagement.selectBrand);


module.exports = router;
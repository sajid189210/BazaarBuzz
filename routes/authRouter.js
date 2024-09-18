const router = require('express').Router();
const authController = require('../Services/googleAuth');


router.get('/login', authController.authLogin)

router.get('/logout', authController.authLogout)

router.get('/google', authController.authWithGoogle)

module.exports = router;
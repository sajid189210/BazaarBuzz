const router = require('express').Router();
const passport = require('passport');
const googleAuthController = require('../controller/userController/googleAuthController');

router.get('/google', googleAuthController.authenticate);

router.get('/google/callback', googleAuthController.callback);

module.exports = router;
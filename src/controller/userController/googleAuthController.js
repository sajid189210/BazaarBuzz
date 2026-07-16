const R = require('../../constants/redirects');
const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const passport = require('passport');
const User = require('../../model/userModel');


const authenticate = (req, res, next) => {
    console.log('Initiating Google authentication...');
    passport.authenticate('google', {
        scope: ['email', 'profile'],
        prompt: 'select_account'
    })(req, res);
};

const callback = async (req, res, next) => {
    console.log('Handling Google callback...');

    passport.authenticate('google', {}, async (authError, authResult) => {
        if (authError) {
            response.serverError(res, authError);
            return;
        }

        if (!authResult) {
            return res.redirect(R.USER_SIGNIN);
        }

        req.session.user = {
            userId: authResult._id,
            googleId: authResult.googleId,
            userName: authResult.username,
            userEmail: authResult.email
        };
        res.redirect(R.HOME);
    })(req, res, next);
};


module.exports = {
    authenticate,
    callback
};

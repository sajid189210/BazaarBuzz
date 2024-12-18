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

    passport.authenticate('google', {
        successRedirect: '/',
        failureRedirect: '/user/signIn'

    }, async (authError, authResult) => {
        if (authError) {
            console.error('Authentication error:', authError);
            res.status(500).json('Authentication error');
            return;
        }

        if (authResult) {
            req.session.user = {
                userId: authResult._id,
                googleId: authResult.googleId,
                userName: authResult.username,
                userEmail: authResult.email
            }
            res.redirect(authResult.successRedirect || '/');

        } else {
            res.redirect(authResult.failureRedirect || '/user/signIn');
        }
    })(req, res, next);
};


module.exports = {
    authenticate,
    callback
};

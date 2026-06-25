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
    console.log('[Google Callback] Callback URL hit:', req.originalUrl);
    console.log('[Google Callback] Session ID:', req.sessionID);

    passport.authenticate('google', {}, async (authError, authResult) => {
        if (authError) {
            console.error('[Google Callback] Authentication error:', authError.message);
            response.serverError(res, authError);
            return;
        }

        if (!authResult) {
            console.log('[Google Callback] No auth result (user likely blocked)');
            return res.redirect('/user/signIn');
        }

        console.log('[Google Callback] User authenticated:', authResult.email);
        req.session.user = {
            userId: authResult._id,
            googleId: authResult.googleId,
            userName: authResult.username,
            userEmail: authResult.email
        };
        console.log('[Google Callback] Session saved, redirecting to /');
        res.redirect('/');
    })(req, res, next);
};


module.exports = {
    authenticate,
    callback
};

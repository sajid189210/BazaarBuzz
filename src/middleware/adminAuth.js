const R = require('../constants/redirects');
const MSG = require('../constants/messages');
const response = require('../Services/responseMapper');

const adminAuth = (req, res, next) => {
    if (req.session.admin) return next();
    if (req.xhr || req.headers.accept?.includes('json')) {
        return response.error(res, MSG.UNAUTHORIZED_AJAX, 401);
    }
    return res.redirect(R.ADMIN_SIGNIN);
};

module.exports = adminAuth;

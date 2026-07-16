//validating admin credentials.
const R = require('../../constants/redirects');
const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const adminModel = require('../../model/adminModel');
const bcrypt = require('bcryptjs');


// validate signin credentials
const validateCredentials = async (req, res) => {

    const { email, password } = req.body;

    try {

        if (!email || !password) {
            req.flash("error", MSG.FILL_ALL_FIELDS);
            return res.redirect(R.ADMIN_SIGNIN);
        }

        const admin = await adminModel.findOne({ email }).lean();

        if (!admin) {
            req.flash('error', MSG.INVALID_CREDENTIALS);
            return res.redirect(R.ADMIN_SIGNIN);
        }

        const isPasswordMatch = await bcrypt.compare(password, admin.password);

        if (!isPasswordMatch) {
            req.flash("error", MSG.INVALID_CREDENTIALS_ASTERISK);
            return res.redirect(R.ADMIN_SIGNIN);
        }

        req.session.admin = { id: admin._id, email: admin.email };
        res.redirect(R.ADMIN_DASHBOARD);

    } catch (err) {
        response.serverError(res, err);
    }
};



//rendering admin sign in page.
const adminSignIn = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect(R.ADMIN_DASHBOARD);
        }

        res.locals.hideUI = true;

        res.render('admin/adminSignIn', { layout: 'admin/layout', title: 'Admin Sign In', message: req.flash() });

    } catch (err) {
        response.serverError(res, err);
    }
};

//admin sign out.
const adminSignOut = (req, res) => {
    try {

        req.session.destroy();
        res.redirect(R.ADMIN_SIGNIN)

    } catch (err) {
        response.serverError(res, err);
    }
}


module.exports = {
    adminSignIn,
    validateCredentials,
    adminSignOut
};

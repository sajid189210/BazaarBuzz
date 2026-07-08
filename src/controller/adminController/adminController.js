//validating admin credentials.
const response = require('../../Services/responseMapper');
const adminModel = require('../../model/adminModel');
const bcrypt = require('bcryptjs');


// validate signin credentials
const validateCredentials = async (req, res) => {

    const { email, password } = req.body;

    try {

        if (!email || !password) {
            req.flash("error", "Please fill out all fields *");
            return res.redirect('/admin/signIn');
        }

        const admin = await adminModel.findOne({ email }).lean();

        if (!admin) {
            req.flash('error', "Invalid credentials");
            return res.redirect("/admin/signIn");
        }

        const isPasswordMatch = await bcrypt.compare(password, admin.password);

        if (!isPasswordMatch) {
            req.flash("error", "Invalid credentials *");
            return res.redirect("/admin/signIn");
        }

        req.session.admin = true;
        res.redirect('/admin/dashboard');

    } catch (err) {
        response.serverError(res, err);
    }
};



//rendering admin sign in page.
const adminSignIn = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard');
        }

        res.render('admin/adminSignIn', { layout: 'admin/layout', title: 'Admin Sign In', message: req.flash() });

    } catch (err) {
        response.serverError(res, err);
    }
};

//admin sign out.
const adminSignOut = (req, res) => {
    try {

        req.session.destroy();
        res.redirect("/admin/signIn")

    } catch (err) {
        response.serverError(res, err);
    }
}


module.exports = {
    adminSignIn,
    validateCredentials,
    adminSignOut
};

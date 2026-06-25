//validating admin credentials.
const response = require('../../Services/responseMapper');

const validateCredentials = async (req, res) => {

    const { email, password } = req.body;
    try {

        if (!email || !password) {
            req.flash("error", "Please fill out all fields *");
            return res.redirect('/admin/signIn');
        }

        if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
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

        res.render('admin/adminSignIn', { message: req.flash() });

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

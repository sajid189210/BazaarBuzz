//validating admin credentials.
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
        console.error(`Error caught validateCredentials in admin controller. ${err}`);
        res.status(500).json('Internal sever Error!');
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
        console.error(`Error caught while rendering admin sign in page. ${err}`);
        res.status(500).json('Internal sever error!');
    }
};



//admin sign out.
const adminSignOut = (req, res) => {
    try {

        req.session.destroy();
        res.redirect("/admin/signIn")

    } catch (err) {
        console.error(`Error caught adminSignOut in admin controller ${err}`);
        res.status(500).json("Internal server error!");
    }
}


module.exports = {
    adminSignIn,
    validateCredentials,
    adminSignOut
};

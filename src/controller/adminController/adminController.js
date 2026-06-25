const adminModel = require('../../model/adminModel');
const bcrypt = require('bcrypt');

//validating changePassword.
const validateChangePassword = async (req, res) => {
    const { email, oldPassword, newPassword, confirmPassword } = req.body;

    try {

        if (!email || !oldPassword || !newPassword || !confirmPassword) {
            req.flash("error", "Please fill out all fields *");
            return res.redirect('/admin/changePassword')
        }

        const admin = await adminModel.findOne({ email });

        if (!admin) {
            req.flash("error", "Invalid email");
            return res.redirect('/admin/changePassword')
        }

        if (await bcrypt.compare(oldPassword, admin.password)) {
            console.log('hi')
            req.flash("error", "Invalid Password.");
            return res.redirect('/admin/changePassword')
        }

        if (newPassword !== confirmPassword) {
            req.flash("error", "Password Mismatch.");
            return res.redirect('/admin/changePassword')
        }

        //updating the password.
        await adminModel.updateOne({ email }, { $set: { password: await bcrypt.hashSync(confirmPassword, 10) } });

        return res.redirect("/admin/signIn")

    } catch (err) {
        console.error(`Error caught validateChangePassword in adminController ${err}`);
        res.status(500).json("Internal server error!");
    }

}



//validating admin credentials.
const validateCredentials = async (req, res) => {

    const { email, password } = req.body;
    try {
        //!For changing admin password.
        // const hashedPassword = await bcrypt.hash(password, 10)
        // //defining admin credentials.
        // const details = {
        //     email: 'admin@gmail.com',
        //     password: hashedPassword
        // };

        // const newAdmin = new adminModel(details);
        // await newAdmin.save();

        if (!email || !password) {
            req.flash("error", "Please fill out all fields *");
            return res.redirect('/admin/signIn');
        }

        const admin = await adminModel.findOne({ email });

        // const hashedPassword = await bcrypt.hash(password, 10)

        if (!(email === admin.email && await bcrypt.compare(password, admin.password))) {
            req.flash("error", "User not found *");
            return res.redirect("/admin/signIn");
        }

        req.session.admin = true;
        res.redirect('/admin/dashboard');

    } catch (err) {
        console.error(`Error caught validateCredentials in admin controller. ${err}`);
        res.status(500).json('Internal sever Error!');
    }
};



//rendering the change password page.
const adminChangePassword = (req, res) => {
    try {

        return res.render('admin/adminChangePassword', { message: req.flash() });

    } catch (err) {
        console.error(`Error caught adminChangePassword in admin controller ${err}`);
        res.status(500).json("Internal server error!");
    }
}



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
    adminChangePassword,
    validateChangePassword,
    adminSignOut
};




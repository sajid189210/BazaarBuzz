const response = require('../../Services/responseMapper');
const userModel = require('../../model/userModel');

//?------finding the user by ID--------------
const getUserById = async (id) => {
    if (!id) throw new Error("No _id");

    return await userModel.findById({ _id: id });
};

const userManagementPage = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect('/admin/signIn');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;
        let filter = {}

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.email = regex;
        }

        const users = await userModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });

        const count = await userModel.countDocuments();

        if (!users) return res.render('admin/userManagementPage', {
            users: [],
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit,
            page,
        })

        res.render('admin/userManagementPage', {
            users,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit,
            page,
        });

    } catch (err) {
        response.serverError(res, err);
    }
};



// //*--------------------Search User-------------------------
// const searchUser = async (req, res) => {
//     try {
//         const search = req.query.search || '';

//         const regex = new RegExp(search, 'i');

//         const users = await userModel.find({ email: regex });

//         res.json({ users });

//     } catch (err) {
//         console.error(`Error in searchUser in userManagementController: ${err.message}`);
//         res.status(500).json({
//             error: 'Internal Server Error',
//             message: err.message
//         });
//     }
// }

//*----------------User Status: unblock----------------------
const unBlockUser = async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return response.error(res, "Invalid user ID provided.", 400);
        }

        const user = await getUserById(id);

        if (user.isBlocked === 'unblocked') {
            return response.error(res, "User is already unblocked", 400);
        }

        await userModel.findByIdAndUpdate(
            { _id: id },
            { $set: { isBlocked: 'unblocked' } },
            { new: true }
        );

        req.session.user = true;

        return response.success(res, {}, "User has been successfully unblocked")

    } catch (err) {
        response.serverError(res, err);
    }
};

//*------------------User Status: block------------------
const blockUser = async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return response.error(res, "Invalid user ID provided.", 400);
        }

        const user = await getUserById(id);

        if (user.isBlocked === 'blocked') {
            return response.error(res, "User is already blocked.", 400);
        }

        await userModel.findByIdAndUpdate(
            { _id: id },
            { $set: { isBlocked: 'blocked' } },
            { new: true }
        );

        req.session.user = false;

        return response.success(res, {}, "User has been successfully blocked");

    } catch (err) {
        response.serverError(res, err);
    }
}



module.exports = {
    userManagementPage,
    unBlockUser,
    blockUser,
}
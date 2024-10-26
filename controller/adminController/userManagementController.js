const userModel = require('../../model/userModel');

//?------finding the user by ID--------------
const getUserById = async (id) => {
    if (!id) throw new Error("No _id");

    return await userModel.findById({ _id: id });
};

const userManagementPage = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect('/admin/signIn');
        
        // const searchTerm = req.query.search || ''
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;

        const skip = (page - 1) * limit;

        const users = await userModel.find().skip(skip).limit(limit).sort({ createdAt: -1 });

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
        console.error(`Error in userManagementPage: ${err.message}`);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
            stack: err.stack
        });
    }
};

// const userManagementPage = async (req, res) => {
//     try {
//         // if (!req.session.admin) return res.redirect('/admin/signIn');
//         const searchTerm = req.query.search || '';
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 5;

//         const skip = (page - 1) * limit;

//         const filteredUsers = await searchUser(req, res);
//         const paginatedUsers = filteredUsers.slice(skip, skip + limit);

//         const count = await userModel.countDocuments({ email: new RegExp(searchTerm, 'i') });

//         res.render('admin/userManagementPage', {
//             users: paginatedUsers,
//             totalPages: Math.ceil(count / limit),
//             currentPage: page,
//             limit,
//             page,
//             searchTerm
//         });

//     } catch (err) {
//         console.error(`Error in userManagementPage: ${err.message}`);
//         res.status(500).json({
//             error: 'Internal Server Error',
//             message: err.message,
//             stack: err.stack
//         });
//     }
// };

//*--------------------Search User-------------------------
const searchUser = async (req, res) => {
    try {
        const search = req.query.search || '';

        const regex = new RegExp(search, 'i');

        const users = await userModel.find({ email: regex });

        res.json({ users });

    } catch (err) {
        console.error(`Error in searchUser in userManagementController: ${err.message}`);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message
        });
    }
}

//*----------------User Status: unblock----------------------
const unBlockUser = async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID provided.'
            });
        }

        const user = await getUserById(id);

        if (user.isBlocked === 'unblocked') {
            return res.status(400).json({
                success: false,
                message: 'User is already unblocked'
            });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            { _id: id },
            { $set: { isBlocked: 'unblocked' } },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'User has been successfully unblocked'
        })

    } catch (err) {
        console.error(`Error caught unBlockUser in the userManagementController. ${err}`);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
            stack: err.stack
        });
    }
};

//*------------------User Status: block------------------
const blockUser = async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID provided.'
            });
        }

        const user = await getUserById(id);

        if (user.isBlocked === 'blocked') {
            return res.status(400).json({
                success: false,
                message: 'User is already blocked.'
            });
        }

        const updatedUser = await userModel.findByIdAndUpdate(
            { _id: id },
            { $set: { isBlocked: 'blocked' } },
            { new: true }
        );

        req.session.user = false;

        return res.status(200).json({
            success: true,
            message: 'User has been successfully blocked'
        });

    } catch (err) {
        console.error(`Error caught unBlockUser in the userManagementController. ${err}`);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
            stack: err.stack
        });
    }
}



module.exports = {
    userManagementPage,
    searchUser,
    unBlockUser,
    blockUser,
}
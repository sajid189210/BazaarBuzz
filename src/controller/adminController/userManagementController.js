const MSG = require('../../constants/messages');
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
        const statusFilter = req.query.status || '';
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';
        const skip = (page - 1) * limit;
        let filter = {};

        if (search) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { email: regex },
                { username: regex }
            ];
        }

        if (statusFilter === 'blocked') {
            filter.isBlocked = 'blocked';
        } else if (statusFilter === 'unblocked') {
            filter.isBlocked = 'unblocked';
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Set to end of the day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const users = await userModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });
        const totalCount = await userModel.countDocuments(filter);

        // If AJAX request, return JSON
        if (req.xhr || req.headers.accept?.includes('json')) {
            return res.json({
                success: true,
                users,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page,
                totalCount,
                limit,
                search,
                statusFilter,
                startDate,
                endDate
            });
        }

        res.render('admin/userManagementPage', {
            layout: false,
            users,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            limit,
            page,
            search,
            statusFilter,
            startDate,
            endDate,
            totalCount
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

//*----------------User Status: unblock----------------------
const unBlockUser = async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return response.error(res, MSG.INVALID_USER_ID, 400);
        }

        const user = await getUserById(id);

        if (user.isBlocked === 'unblocked') {
            return response.error(res, MSG.USER_ALREADY_UNBLOCKED, 400);
        }

        await userModel.findByIdAndUpdate(
            { _id: id },
            { $set: { isBlocked: 'unblocked' } },
            { new: true }
        );

        req.session.user = true;

        return response.success(res, {}, MSG.USER_UNBLOCKED)

    } catch (err) {
        response.serverError(res, err);
    }
};

//*------------------User Status: block------------------
const blockUser = async (req, res) => {
    try {

        const id = req.params.id;

        if (!id) {
            return response.error(res, MSG.INVALID_USER_ID, 400);
        }

        const user = await getUserById(id);

        if (user.isBlocked === 'blocked') {
            return response.error(res, MSG.USER_ALREADY_BLOCKED, 400);
        }

        await userModel.findByIdAndUpdate(
            { _id: id },
            { $set: { isBlocked: 'blocked' } },
            { new: true }
        );

        req.session.user = false;

        return response.success(res, {}, MSG.USER_BLOCKED);

    } catch (err) {
        response.serverError(res, err);
    }
}



module.exports = {
    userManagementPage,
    unBlockUser,
    blockUser,
}
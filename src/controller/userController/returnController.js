const R = require('../../constants/redirects');
const response = require('../../Services/responseMapper');
const Order = require('../../model/orderModel');
const MSG = require('../../constants/messages');

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const requestProductReturn = async (req, res) => {
    if (!req.session.user) return res.redirect(R.USER_SIGNIN);

    const { orderId, orderItemId, reason } = req.body;

    if (!orderId || !orderItemId || !reason?.trim()) {
        return response.error(res, MSG.RETURN_REQUIRED, 400);
    }

    try {
        const order = await Order.findOne({ _id: orderId, 'items._id': orderItemId });

        if (!order) {
            return response.error(res, MSG.RETURN_ORDER_NOT_FOUND, 404);
        }

        const item = order.items.id(orderItemId);

        if (!item) {
            return response.error(res, MSG.ITEM_NOT_FOUND, 404);
        }

        if (item.status !== 'delivered') {
            return response.error(res, MSG.RETURN_ONLY_DELIVERED, 400);
        }

        if (item.return?.status === 'requested') {
            return response.error(res, MSG.RETURN_ALREADY_REQUESTED, 400);
        }

        if (item.return?.status === 'approved') {
            return response.error(res, MSG.RETURN_ALREADY_APPROVED, 400);
        }

        if (!item.deliveredAt) {
            return response.error(res, MSG.RETURN_NO_DELIVERY_DATE, 400);
        }

        const timeSinceDelivery = Date.now() - new Date(item.deliveredAt).getTime();
        if (timeSinceDelivery > SEVEN_DAYS) {
            return response.error(res, MSG.RETURN_WINDOW_EXPIRED, 400);
        }

        item.return = {
            status: 'requested',
            reason: reason.trim(),
        };

        await order.save();

        return response.success(res, {}, MSG.RETURN_REQUEST_SUBMITTED);
    } catch (err) {
        return response.serverError(res, err);
    }
};

module.exports = { requestProductReturn };

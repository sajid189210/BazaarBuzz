const response = require('../../Services/responseMapper');
const Order = require('../../model/orderModel');

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const requestProductReturn = async (req, res) => {
    if (!req.session.user) return res.redirect('/user/signIn');

    const { orderId, orderItemId, reason } = req.body;

    if (!orderId || !orderItemId || !reason?.trim()) {
        return response.error(res, "Order ID, item ID, and reason are required.", 400);
    }

    try {
        const order = await Order.findOne({ _id: orderId, 'items._id': orderItemId });

        if (!order) {
            return response.error(res, "Order or item not found.", 404);
        }

        const item = order.items.id(orderItemId);

        if (!item) {
            return response.error(res, "Item not found.", 404);
        }

        if (item.status !== 'delivered') {
            return response.error(res, "Only delivered items can be returned.", 400);
        }

        if (item.return?.status === 'requested') {
            return response.error(res, "Return already requested for this item.", 400);
        }

        if (item.return?.status === 'approved') {
            return response.error(res, "Return already approved for this item.", 400);
        }

        if (!item.deliveredAt) {
            return response.error(res, "Delivery date not recorded. Cannot process return.", 400);
        }

        const timeSinceDelivery = Date.now() - new Date(item.deliveredAt).getTime();
        if (timeSinceDelivery > SEVEN_DAYS) {
            return response.error(res, "Return window has expired. Items can only be returned within 7 days of delivery.", 400);
        }

        item.return = {
            status: 'requested',
            reason: reason.trim(),
        };

        await order.save();

        return response.success(res, {}, "Return request submitted successfully. Awaiting admin approval.");
    } catch (err) {
        return response.serverError(res, err);
    }
};

module.exports = { requestProductReturn };

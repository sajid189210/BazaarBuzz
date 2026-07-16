const MSG = require('../../constants/messages');
const response = require('../../Services/responseMapper');
const Category = require('../../model/categoryModel');
const Offer = require('../../model/offerModel');


const renderOffer = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const statusFilter = req.query.status || '';
        const categoryFilter = req.query.category || '';

        let filter = { isDeleted: false };

        if (search) {
            filter.$or = [
                { offerName: { $regex: search, $options: 'i' } },
                { brandName: { $regex: search, $options: 'i' } },
            ];
        }

        if (statusFilter) {
            filter.isActive = statusFilter === 'active';
        }

        if (categoryFilter) {
            const catDoc = await Category.findOne({ title: categoryFilter, isDeleted: false });
            if (catDoc) filter.category = catDoc._id;
        }

        const [categories, offers, totalOffers] = await Promise.all([
            Category.find({ isDeleted: false, isActive: true }),
            Offer.find(filter)
                .populate('category', 'title')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Offer.countDocuments(filter),
        ]);

        res.render('admin/offer', {
            layout: false,
            categories,
            offers,
            currentPage: page,
            totalPages: Math.ceil(totalOffers / limit),
            totalCount: totalOffers,
            limit,
            search,
            statusFilter,
            categoryFilter,
        })

    } catch (err) {
        response.serverError(res, err);
    }
};

const createOffer = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    const { offerName, brandName, discountValue, category } = req.body;

    try {
        if (!offerName || !brandName || !discountValue || !category) {
            return response.error(res, MSG.OFFER_FIELDS_MISSING, 400);
        }

        const catDoc = await Category.findOne({ title: category, isDeleted: false, isActive: true });
        if (!catDoc) {
            return response.error(res, MSG.OFFER_CATEGORY_INACTIVE, 400);
        }

        const existing = await Offer.findOne({ brandName, category: catDoc._id });
        if (existing) {
            return response.error(res, MSG.OFFER_EXISTS, 400);
        }

        const newOffer = new Offer({
            offerName,
            brandName,
            category: catDoc._id,
            discount: discountValue,
        });

        await newOffer.save();

        response.success(res, {}, MSG.OFFER_CREATED, 201)

    } catch (err) {
        response.serverError(res, err);
    }
};

const changeStatus = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    const { offerId } = req.body;

    try {
        const offer = await Offer.findById(offerId);
        if (!offer) return response.error(res, MSG.OFFER_NOT_FOUND, 404);

        offer.isActive = !offer.isActive;
        await offer.save();

        response.success(res, {}, MSG.OFFER_STATUS_CHANGED);

    } catch (err) {
        response.serverError(res, err);
    }
};

const updateOffer = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    const { discountValue, offerName, brandName, offerId, category } = req.body;

    try {
        const catDoc = await Category.findOne({ title: category, isDeleted: false, isActive: true });
        if (!catDoc) {
            return response.error(res, MSG.OFFER_CATEGORY_INACTIVE, 400);
        }

        const updateOffer = await Offer.findByIdAndUpdate(
            offerId,
            { $set: { discount: discountValue, offerName, brandName, category: catDoc._id } },
            { new: true }
        );

        if (!updateOffer) {
            return response.error(res, MSG.OFFER_UPDATE_FAILED, 400);
        }

        response.success(res, {}, MSG.OFFER_UPDATED);
    } catch (err) {
        if (err.code === 11000) {
            return response.error(res, MSG.OFFER_NAME_UNIQUE, 409);
        }

        response.serverError(res, err);
    }
};

const removeOffer = async (req, res) => {
    const offerId = req.params.id;

    const offer = await Offer.findById(offerId);
    if (!offer) return response.error(res, MSG.OFFER_NOT_FOUND, 404);

    offer.isDeleted = true;
    offer.isActive = false;
    await offer.save();

    response.success(res, {}, MSG.OFFER_REMOVED)
}

module.exports = {
    changeStatus,
    createOffer,
    renderOffer,
    updateOffer,
    removeOffer,
}
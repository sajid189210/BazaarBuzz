const response = require('../../Services/responseMapper');
const Category = require('../../model/categoryModel');
const Offer = require('../../model/offerModel');


const renderOffer = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    try {

        const [category, offers] = await Promise.all([
            Category.findOne({ title: 'Clothes' }).sort({ createdAt: -1 }),
            Offer.find().sort({ createdAt: -1 })
        ]);

        res.render('admin/offer', { layout: false, category, offers })

    } catch (err) {
        response.serverError(res, err);
    }
};

const createOffer = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    const { offerName, brandName, discountValue } = req.body;

    try {
        if (!offerName || !brandName || !discountValue) {
            return response.error(res, "Required fields are missing.", 400);
        }

        const offer = await Offer.find();

        if (offer && offer.brandName === brandName) {
            return response.error(res, "Brand with offer already exists.", 400);
        }

        const newOffer = new Offer({
            offerName,
            brandName,
            discount: discountValue,
        });

        await newOffer.save();

        response.success(res, {}, "Offer created successfully", 201)

    } catch (err) {
        response.serverError(res, err);
    }
};

const changeStatus = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    const { offerId, status } = req.body;

    try {
        console.log(offerId)

        const updatedOffer = await Offer.findByIdAndUpdate(offerId, { $set: { isActive: status } }, { new: true });

        if (!updatedOffer) {
            return response.error(res, "Sorry!, Something happened!", 400)
        }

        response.success(res, {}, "status changed");

    } catch (err) {
        response.serverError(res, err);
    }
};

const updateOffer = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    const { discountValue, offerName, brandName, offerId } = req.body;

    try {
        const updateOffer = await Offer.findByIdAndUpdate(
            offerId,
            { $set: { discount: discountValue, offerName, brandName, } },
            { new: true }
        );

        if (!updateOffer) {
            return response.error(res, "Could not find offer", 400);
        }

        response.success(res, {}, "Offer updated successfully");
    } catch (err) {
        if (err.code === 11000) { // MongoDB duplicate key error code
            console.error(`MongoDB duplicate key error: ${err}`);
            return response.error(res, "Offer name must be unique.", 409);
        }

        response.serverError(res, err);
    }
};

const removeOffer = async (req, res) => {
    const offerId = req.params.id;

    const result = await Offer.findByIdAndDelete(offerId);
    console.log(result)

    if (!result) {
        return response.error(res, "Could not remove the offer.", 400)
    }

    response.success(res, {}, "Offer removed successfully")
}

module.exports = {
    changeStatus,
    createOffer,
    renderOffer,
    updateOffer,
    removeOffer,
}
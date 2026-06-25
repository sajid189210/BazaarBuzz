const Category = require('../../model/categoryModel');
const Offer = require('../../model/offerModel');


const renderOffer = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    try {

        const [category, offers] = await Promise.all([
            Category.findOne({ title: 'Clothes' }).sort({ createdAt: -1 }),
            Offer.find().sort({ createdAt: -1 })
        ]);

        res.render('admin/offer', { category, offers })

    } catch (err) {
        console.error(`Error in renderOffer : ${err}`);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const createOffer = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    const { offerName, brandName, discountValue } = req.body;

    try {
        if (!offerName || !brandName || !discountValue) {
            return res.status(400).json({ success: false, message: 'Required fields are missing.' });
        }

        const offer = await Offer.find();

        if (offer && offer.brandName === brandName) {
            return res.status(400).json({ success: false, message: 'Brand with offer already exists.' });
        }

        const newOffer = new Offer({
            offerName,
            brandName,
            discount: discountValue,
        });

        await newOffer.save();

        res.status(201).json({ success: true, message: 'Offer created successfully' })

    } catch (err) {
        console.error(`Error in createOffer : ${err}`);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const changeStatus = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    const { offerId, status } = req.body;

    try {
        console.log(offerId)

        const updatedOffer = await Offer.findByIdAndUpdate(offerId, { $set: { isActive: status } }, { new: true });

        if (!updatedOffer) {
            return res.status(400).json({ success: false, message: 'Sorry!, Something happened!' })
        }

        res.status(200).json({ success: true, message: 'status changed' });

    } catch (err) {
        console.error(`Error in changeStatus : ${err}`);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
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
            return res.status(400).json({ success: false, message: 'Could not find offer' });
        }

        res.status(200).json({ success: true, message: 'Offer updated successfully' });
    } catch (err) {
        if (err.code === 11000) { // MongoDB duplicate key error code
            console.error(`MongoDB duplicate key error: ${err}`);
            return res.status(409).json({ success: false, message: 'Offer name must be unique.' });
        }

        console.error(`Error in updateOffer : ${err}`);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

const removeOffer = async (req, res) => {
    const offerId = req.params.id;

    const result = await Offer.findByIdAndDelete(offerId);
    console.log(result)

    if (!result) {
        return res.status(400).json({ success: false, message: 'Could not remove the offer.' })
    }

    res.status(200).json({ success: true, message: 'Offer removed successfully' })
}

module.exports = {
    changeStatus,
    createOffer,
    renderOffer,
    updateOffer,
    removeOffer,
}
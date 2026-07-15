const response = require('../../Services/responseMapper');
const { WALLET_TYPE_ADMIN } = require('../../constants/walletTypes');
const Wallet = require('../../model/walletModel');

const renderWalletPage = async (req, res) => {
    try {
        if (!req.session.admin) return res.redirect('/admin/signIn');

        const adminId = req.session.admin.id;

        let wallet = await Wallet.findOne({ type: WALLET_TYPE_ADMIN });

        if (!wallet) {
            wallet = new Wallet({ owner: adminId, type: WALLET_TYPE_ADMIN, balance: 0 });
            await wallet.save();
        }

        const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
        const page = Math.max(1, parseInt(req.query.page) || 1);

        const sortedTransactions = [...wallet.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        const totalTransactions = sortedTransactions.length;

        let runningBalance = wallet.balance;
        const enriched = sortedTransactions.map(txn => {
            const t = txn.toObject();
            if (t.type === 'credit') {
                t.balanceBefore = Math.round((runningBalance - t.amount) * 100) / 100;
                t.balanceAfter = runningBalance;
                runningBalance = t.balanceBefore;
            } else {
                t.balanceBefore = Math.round((runningBalance + t.amount) * 100) / 100;
                t.balanceAfter = runningBalance;
                runningBalance = t.balanceBefore;
            }
            return t;
        });

        const paginatedTransactions = enriched.slice((page - 1) * limit, page * limit);

        res.render('admin/adminWallet', {
            layout: false,
            wallet,
            transactions: paginatedTransactions,
            currentPage: page,
            totalPages: Math.ceil(totalTransactions / limit),
            totalTransactions,
            limit,
        });

    } catch (err) {
        response.serverError(res, err);
    }
};

module.exports = { renderWalletPage };

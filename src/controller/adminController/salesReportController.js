const Order = require('../../model/orderModel');
const PDFDocument = require('pdfkit');

function buildFilter(from, to, payment, status) {
    const filter = {};
    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
    }
    if (payment && payment !== 'all') {
        filter['payment.method'] = payment;
    }
    if (status && status !== 'all') {
        filter.status = status;
    }
    return filter;
}

const getSalesReport = async (req, res) => {
    try {
        const { from, to, payment, status } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));

        const filter = buildFilter(from, to, payment, status);

        const [stats] = await Order.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalOrders: { $sum: 1 },
                    totalDiscount: { $sum: '$productDiscount' },
                    totalTax: { $sum: '$tax' },
                    totalSubtotal: { $sum: '$subtotal' },
                }
            }
        ]);

        const summary = stats || { totalRevenue: 0, totalOrders: 0, totalDiscount: 0, totalTax: 0, totalSubtotal: 0 };
        const aov = summary.totalOrders > 0 ? summary.totalRevenue / summary.totalOrders : 0;

        const totalFiltered = await Order.countDocuments(filter);

        const orders = await Order.find(filter)
            .populate('user', 'username email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.render('admin/adminSalesReport', {
            layout: 'admin/layout',
            title: 'Sales Report',
            orders,
            summary,
            aov: Math.round(aov * 100) / 100,
            from: from || '',
            to: to || '',
            payment: payment || 'all',
            status: status || 'all',
            currentPage: page,
            totalPages: Math.ceil(totalFiltered / limit),
        });

    } catch (err) {
        console.error('Sales report error:', err);
        res.status(500).send('Failed to load sales report.');
    }
};

const downloadSalesReportCSV = async (req, res) => {
    try {
        const { from, to, payment, status } = req.query;
        const filter = buildFilter(from, to, payment, status);

        const orders = await Order.find(filter)
            .populate('user', 'username email')
            .sort({ createdAt: -1 });

        const header = 'Order ID,Date,Customer,Items,Subtotal,Discount,Tax,Total,Payment Method,Payment Status,Status\r\n';

        const rows = orders.map(o => {
            const date = new Date(o.createdAt).toLocaleDateString('en-IN');
            const cust = o.user ? (o.user.username || o.user.email || '—') : '—';
            const items = o.items.length;
            const subtotal = o.subtotal || 0;
            const discount = o.productDiscount || 0;
            const tax = o.tax || 0;
            const total = o.total || 0;
            const payMethod = o.payment?.method || '-';
            const payStatus = o.payment?.status || '-';
            const statusVal = o.status;

            const esc = v => String(v).replace(/,/g, ' ').replace(/\n/g, ' ');
            return `${esc(o._id)},${esc(date)},${esc(cust)},${items},${subtotal},${discount},${tax},${total},${esc(payMethod)},${esc(payStatus)},${esc(statusVal)}\r\n`;
        }).join('');

        const dateLabel = from || to ? `_${from || 'start'}_${to || 'end'}` : '';
        const filename = `sales_report${dateLabel}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(header + rows);

    } catch (err) {
        console.error('CSV download error:', err);
        res.status(500).send('Failed to generate CSV.');
    }
};

const downloadSalesReportPDF = async (req, res) => {
    try {
        const { from, to, payment, status } = req.query;
        const filter = buildFilter(from, to, payment, status);

        const [stats] = await Order.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalOrders: { $sum: 1 },
                    totalDiscount: { $sum: '$productDiscount' },
                    totalTax: { $sum: '$tax' },
                    totalSubtotal: { $sum: '$subtotal' },
                }
            }
        ]);

        const summary = stats || { totalRevenue: 0, totalOrders: 0, totalDiscount: 0, totalTax: 0, totalSubtotal: 0 };
        const aov = summary.totalOrders > 0 ? Math.round((summary.totalRevenue / summary.totalOrders) * 100) / 100 : 0;

        const orders = await Order.find(filter)
            .populate('user', 'username email')
            .sort({ createdAt: -1 });

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        const dateLabel = from || to ? `_${from || 'start'}_${to || 'end'}` : '';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales_report${dateLabel}.pdf`);

        doc.pipe(res);

        const BLUE = '#1e40af';
        const GRAY = '#6b7280';
        const DARK = '#1f2937';
        const LIGHT_BG = '#f3f4f6';
        const MARGIN = 50;
        const PAGE_WIDTH = 595.28;
        const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
        const ROW_H = 18;

        // ─── Header ───
        doc.fontSize(22).font('Helvetica-Bold').fillColor(BLUE)
            .text('BAZZARBUZZ', MARGIN, 45);

        doc.fontSize(16).font('Helvetica-Bold').fillColor(DARK)
            .text('Sales Report', MARGIN, 45, { align: 'right' });

        doc.fontSize(9).font('Helvetica').fillColor(GRAY)
            .text('Fashion Marketplace', MARGIN, 72);

        let dateRangeStr = 'All time';
        if (from && to) dateRangeStr = `${new Date(from).toLocaleDateString('en-IN')} — ${new Date(to).toLocaleDateString('en-IN')}`;
        else if (from) dateRangeStr = `From ${new Date(from).toLocaleDateString('en-IN')}`;
        else if (to) dateRangeStr = `Until ${new Date(to).toLocaleDateString('en-IN')}`;

        doc.fontSize(9).font('Helvetica').fillColor(GRAY)
            .text(dateRangeStr, MARGIN, 72, { align: 'right' });

        const sepY = 98;
        doc.moveTo(MARGIN, sepY).lineTo(PAGE_WIDTH - MARGIN, sepY).strokeColor('#d1d5db').lineWidth(1).stroke();

        // ─── Summary Cards ───
        const cardY = sepY + 18;
        const cardW = (CONTENT_WIDTH - 24) / 5;
        const cardH = 52;
        const cardGap = 6;

        const cards = [
            { label: 'Total Revenue', value: `₹${(summary.totalRevenue || 0).toLocaleString()}` },
            { label: 'Orders', value: String(summary.totalOrders || 0) },
            { label: 'AOV', value: `₹${aov.toLocaleString()}` },
            { label: 'Discount', value: `-₹${(summary.totalDiscount || 0).toLocaleString()}` },
            { label: 'Tax', value: `₹${(summary.totalTax || 0).toLocaleString()}` },
        ];

        cards.forEach((card, i) => {
            const x = MARGIN + i * (cardW + cardGap);
            doc.roundedRect(x, cardY, cardW, cardH, 4).fill(LIGHT_BG);
            doc.fontSize(7).font('Helvetica-Bold').fillColor(GRAY)
                .text(card.label, x + 6, cardY + 6, { width: cardW - 12, align: 'center' });
            doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
                .text(card.value, x + 6, cardY + 24, { width: cardW - 12, align: 'center' });
        });

        // ─── Orders Table ───
        const tableY = cardY + cardH + 20;
        const colWidths = [18, 70, 55, 72, 55, 50, 40, 55, 80];
        const colAlign = ['center', 'left', 'left', 'left', 'right', 'right', 'right', 'right', 'left'];
        const colKeys = ['#', 'Order', 'Date', 'Customer', 'Subtotal', 'Disc', 'Tax', 'Total', 'Status'];
        let colPos = [];
        let cursor = MARGIN;
        colWidths.forEach(w => { colPos.push(cursor); cursor += w; });

        let rowY = tableY;

        orders.forEach((order, idx) => {
            const lineH = ROW_H + 4;

            // Check page break
            if (rowY + lineH > 740) {
                doc.addPage();
                rowY = 50;
            }

            const cust = order.user ? (order.user.username || order.user.email || '—') : '—';
            const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const subtotal = order.subtotal || 0;
            const discount = order.productDiscount || 0;
            const tax = order.tax || 0;
            const total = order.total || 0;
            const s = order.status;
            const orderLabel = String(order._id).slice(-8).toUpperCase();

            // Alternate row bg
            if (idx % 2 === 1) {
                doc.rect(MARGIN, rowY, CONTENT_WIDTH, lineH).fill('#fafafa');
            }

            doc.fontSize(7).font('Helvetica').fillColor(DARK);

            const vals = [
                { text: String(idx + 1), i: 0 },
                { text: orderLabel, i: 1 },
                { text: date, i: 2 },
                { text: cust, i: 3 },
                { text: `₹${subtotal.toFixed(0)}`, i: 4 },
                { text: discount > 0 ? `-₹${discount.toFixed(0)}` : '—', i: 5, color: discount > 0 ? '#059669' : null },
                { text: `₹${tax.toFixed(0)}`, i: 6 },
                { text: `₹${total.toFixed(0)}`, i: 7 },
                { text: s.charAt(0).toUpperCase() + s.slice(1), i: 8 },
            ];

            vals.forEach(v => {
                const x = colPos[v.i];
                const w = colWidths[v.i];
                const a = colAlign[v.i];
                if (v.color) doc.fillColor(v.color);
                doc.text(v.text, x + 4, rowY + 4, { width: w - 8, align: a });
                doc.fillColor(DARK);
            });

            rowY += lineH;
        });

        // ─── Table header (drawn after data to paint over bg) ───
        if (orders.length > 0) {
            const headerY = tableY - ROW_H - 6;
            doc.rect(MARGIN, headerY, CONTENT_WIDTH, ROW_H + 6).fill(LIGHT_BG);
            doc.fontSize(7).font('Helvetica-Bold').fillColor(DARK);
            colKeys.forEach((key, i) => {
                doc.text(key, colPos[i] + 4, headerY + 6, { width: colWidths[i] - 8, align: colAlign[i] });
            });
        }

        // ─── Footer ───
        const footerY = Math.max(rowY + 40, 720);
        doc.moveTo(MARGIN, footerY).lineTo(PAGE_WIDTH - MARGIN, footerY).strokeColor('#d1d5db').lineWidth(1).stroke();
        doc.fontSize(8).font('Helvetica').fillColor(GRAY)
            .text(`Generated on ${new Date().toLocaleString('en-IN')}`, MARGIN, footerY + 15, { align: 'center', width: CONTENT_WIDTH });

        doc.end();

    } catch (err) {
        console.error('PDF download error:', err);
        res.status(500).send('Failed to generate PDF.');
    }
};

module.exports = { getSalesReport, downloadSalesReportCSV, downloadSalesReportPDF };

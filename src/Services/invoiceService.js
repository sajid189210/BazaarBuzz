const PDFDocument = require('pdfkit');
const { truncCurrency } = require('../utils/currencyUtils');
const colorName = require('../utils/colorName').name;

const generateInvoicePDF = (res, order, items, options = {}) => {
    const { showStatus = false } = options;

    const itemGross = items.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);
    const totalGross = order.items.reduce((sum, i) => sum + (i.finalPrice * i.quantity), 0);
    const ratio = totalGross > 0 ? itemGross / totalGross : 0;

    const couponDiscount = truncCurrency((order.coupon?.discount || 0) * ratio);
    const invoiceTax = truncCurrency((order.tax || 0) * ratio);
    const invoiceShipping = truncCurrency((order.shippingFee || 0) * ratio);
    const grandTotal = truncCurrency(itemGross - couponDiscount + invoiceTax + invoiceShipping);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${order._id}.pdf`);

    doc.pipe(res);

    const BLUE = '#1e40af';
    const GRAY = '#6b7280';
    const DARK = '#1f2937';
    const LIGHT_BG = '#f3f4f6';
    const MARGIN = 50;
    const PAGE_WIDTH = 595.28;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

    doc.fontSize(26).font('Helvetica-Bold').fillColor(BLUE)
        .text('BAZZARBUZZ', MARGIN, 50, { continued: false });

    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
        .text('Fashion Marketplace', MARGIN, 78);

    doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK)
        .text('TAX INVOICE', MARGIN, 50, { align: 'right' });

    const sepY = 105;
    doc.moveTo(MARGIN, sepY).lineTo(PAGE_WIDTH - MARGIN, sepY).strokeColor('#d1d5db').lineWidth(1).stroke();

    const metaY = sepY + 20;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(GRAY);

    const leftMeta = [
        { label: 'Invoice No.', value: `INV-${String(order._id).slice(-8).toUpperCase()}` },
        { label: 'Order ID', value: String(order._id) },
    ];
    const rightMeta = [
        { label: 'Invoice Date', value: new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
        { label: 'Payment', value: `${(order.payment?.method || '-').toUpperCase()} / ${(order.payment?.status || '-')}` },
    ];

    leftMeta.forEach((item, i) => {
        doc.text(item.label, MARGIN, metaY + i * 16);
    });
    doc.font('Helvetica').fillColor(DARK);
    leftMeta.forEach((item, i) => {
        doc.text(item.value, MARGIN + 80, metaY + i * 16);
    });

    doc.font('Helvetica-Bold').fillColor(GRAY);
    rightMeta.forEach((item, i) => {
        doc.text(item.label, PAGE_WIDTH - MARGIN - 160, metaY + i * 16);
    });
    doc.font('Helvetica').fillColor(DARK);
    rightMeta.forEach((item, i) => {
        doc.text(item.value, PAGE_WIDTH - MARGIN - 90, metaY + i * 16);
    });

    const billY = metaY + 16 * Math.max(leftMeta.length, rightMeta.length) + 20;
    const sepY2 = billY;
    doc.moveTo(MARGIN, sepY2).lineTo(PAGE_WIDTH - MARGIN, sepY2).strokeColor('#d1d5db').lineWidth(1).stroke();

    const addr = order.shippingAddress;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK)
        .text('Bill To:', MARGIN, sepY2 + 15);

    doc.fontSize(9).font('Helvetica').fillColor(DARK)
        .text(addr.contactName, MARGIN, sepY2 + 32);
    const addrLine = [addr.building, addr.street].filter(Boolean).join(', ') + ', ' +
        (addr.landmark ? addr.landmark + ', ' : '') +
        `${addr.district}, ${addr.state} — ${addr.pincode}`;
    doc.text(addrLine, MARGIN, sepY2 + 48, { width: CONTENT_WIDTH });
    doc.text(`Phone: ${addr.contactNumber}`, MARGIN, sepY2 + 66);

    const tableY = sepY2 + 95;
    const sepY3 = tableY - 10;
    doc.moveTo(MARGIN, sepY3).lineTo(PAGE_WIDTH - MARGIN, sepY3).strokeColor('#d1d5db').lineWidth(1).stroke();

    const colKeys = showStatus
        ? ['#', 'Item / Variant', 'Status', 'Qty', 'MRP', 'Disc', 'Rate', 'Total']
        : ['#', 'Item / Variant', 'Qty', 'MRP', 'Disc', 'Rate', 'Total'];

    const colWidths = showStatus
        ? [22, 160, 45, 35, 48, 45, 60, 75]
        : [22, 190, 35, 48, 45, 60, 75];

    const colPos = [];
    let x = MARGIN;
    colWidths.forEach(w => { colPos.push(x); x += w; });

    const rowHeight = 22;

    doc.rect(MARGIN, tableY, CONTENT_WIDTH, rowHeight).fill(LIGHT_BG);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK);
    colKeys.forEach((key, i) => {
        doc.text(key, colPos[i] + 4, tableY + 6, { width: colWidths[i] - 8, align: i === 0 ? 'center' : i >= 2 ? 'right' : 'left' });
    });

    doc.fontSize(8).font('Helvetica').fillColor(DARK);
    let rowY = tableY + rowHeight;
    items.forEach((item, idx) => {
        const mrp = item.unitPrice || 0;
        const rate = item.finalPrice || 0;
        const discPerUnit = Math.max(0, mrp - rate);
        const lineTotal = rate * item.quantity;
        const hex = item.selectedColor || '#ccc';
        const cName = colorName(hex);
        const variantText = (item.selectedSize || '-') + '  ' + cName;

        if (idx % 2 === 1) {
            doc.rect(MARGIN, rowY, CONTENT_WIDTH, rowHeight).fill('#fafafa');
        }

        doc.font('Helvetica').fontSize(8).fillColor(DARK);
        doc.text(String(idx + 1), colPos[0] + 4, rowY + 6, { width: colWidths[0] - 8, align: 'center' });

        const itemX = colPos[1] + 4;
        const itemW = colWidths[1] - 8;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK);
        doc.text(item.name || 'Product', itemX, rowY + 2, { width: itemW, align: 'left' });
        doc.font('Helvetica').fontSize(7).fillColor(GRAY);
        doc.text(variantText, itemX, rowY + 12, { width: itemW, align: 'left' });

        let ci = 2;

        if (showStatus) {
            const statusX = colPos[ci] + 4;
            const statusW = colWidths[ci] - 8;
            const statusLabel = item.status === 'partially_delivered' ? 'Partially Delivered' :
                item.status === 'partially_returned' ? 'Partially Returned' :
                item.status.charAt(0).toUpperCase() + item.status.slice(1);
            doc.font('Helvetica').fontSize(7).fillColor(DARK);
            doc.text(statusLabel, statusX, rowY + 6, { width: statusW, align: 'left' });
            ci++;
        }

        doc.font('Helvetica').fontSize(8).fillColor(DARK);
        doc.text(String(item.quantity), colPos[ci] + 4, rowY + 6, { width: colWidths[ci] - 8, align: 'right' });
        ci++;

        doc.text(`₹${mrp.toFixed(2)}`, colPos[ci] + 4, rowY + 6, { width: colWidths[ci] - 8, align: 'right' });
        ci++;

        if (discPerUnit > 0) {
            doc.fillColor('#059669');
            doc.text(`-₹${discPerUnit.toFixed(2)}`, colPos[ci] + 4, rowY + 6, { width: colWidths[ci] - 8, align: 'right' });
            doc.fillColor(DARK);
        } else {
            doc.text('—', colPos[ci] + 4, rowY + 6, { width: colWidths[ci] - 8, align: 'right' });
        }
        ci++;

        doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK);
        doc.text(`₹${rate.toFixed(2)}`, colPos[ci] + 4, rowY + 6, { width: colWidths[ci] - 8, align: 'right' });
        ci++;

        doc.text(`₹${lineTotal.toFixed(2)}`, colPos[ci] + 4, rowY + 6, { width: colWidths[ci] - 8, align: 'right' });

        rowY += rowHeight;
    });

    const summaryY = rowY + 15;
    const summaryX = PAGE_WIDTH - MARGIN - 220;
    const summaryW = 220;
    const valueX = summaryX + 80;
    const valueW = summaryW - 80;

    let mrpSubtotal = 0;
    let prodDiscSum = 0;
    let offerDiscSum = 0;
    let offerName = '';
    for (const item of items) {
        const p = item.unitPrice || 0;
        const f = item.finalPrice || 0;
        const oa = item.offerDiscount || 0;
        const q = item.quantity;
        mrpSubtotal += p * q;
        prodDiscSum += Math.max(0, p - f - oa) * q;
        offerDiscSum += oa * q;
        if (item.offerName && !offerName) offerName = item.offerName;
    }

    const sumLines = [
        { label: 'Subtotal (MRP)', value: `₹${mrpSubtotal.toFixed(2)}`, bold: false },
    ];
    if (prodDiscSum > 0) {
        sumLines.push({ label: 'Product Discount', value: `-₹${prodDiscSum.toFixed(2)}`, bold: false, green: true });
    }
    if (offerDiscSum > 0) {
        sumLines.push({ label: offerName || 'Brand Offer', value: `-₹${offerDiscSum.toFixed(2)}`, bold: false, green: true });
    }
    sumLines.push({ label: null, value: null, isLine: true });
    sumLines.push({ label: 'Taxable Subtotal', value: `₹${itemGross.toFixed(2)}`, bold: false });
    if (couponDiscount > 0) {
        sumLines.push({ label: 'Coupon', value: `-₹${couponDiscount.toFixed(2)}`, bold: false, green: true });
    }
    if (invoiceTax > 0) {
        sumLines.push({ label: 'Tax (5%)', value: `₹${invoiceTax.toFixed(2)}`, bold: false });
    }
    sumLines.push({ label: 'Shipping', value: `₹${invoiceShipping.toFixed(2)}`, bold: false });
    sumLines.push({ label: null, value: null, isLine: true });
    sumLines.push({ label: 'Grand Total', value: `₹${grandTotal.toFixed(2)}`, bold: true });
    if (showStatus) {
        const delivered = order.items.filter(i => i.status === 'delivered');
        let earnedRevenue = 0;
        if (delivered.length) {
            const earnedGross = delivered.reduce((s, i) => s + (i.finalPrice * i.quantity), 0);
            const ratio = totalGross > 0 ? earnedGross / totalGross : 0;
            const couponShare = truncCurrency((order.coupon?.discount || 0) * ratio);
            const taxShare = truncCurrency((order.tax || 0) * ratio);
            const shippingShare = truncCurrency((order.shippingFee || 0) * ratio);
            earnedRevenue = earnedGross - couponShare + taxShare + shippingShare;
        }
        sumLines.push({ label: null, value: null, isLine: true });
        sumLines.push({ label: 'Total Earned (Revenue)', value: `₹${earnedRevenue.toFixed(2)}`, bold: true, earned: true });
    }

    let sy = summaryY;
    sumLines.forEach(line => {
        if (line.isLine) {
            doc.moveTo(summaryX, sy + 2).lineTo(PAGE_WIDTH - MARGIN, sy + 2).strokeColor('#d1d5db').lineWidth(1).stroke();
            sy += 10;
            return;
        }
        if (line.earned) {
            doc.font('Helvetica-Bold').fontSize(11).fillColor(BLUE);
        } else if (line.bold) {
            doc.font('Helvetica-Bold').fontSize(11).fillColor(DARK);
        } else if (line.green) {
            doc.font('Helvetica').fontSize(9).fillColor('#059669');
        } else {
            doc.font('Helvetica').fontSize(9).fillColor(GRAY);
        }
        doc.text(line.label, summaryX, sy);
        doc.text(line.value, valueX, sy, { width: valueW, align: 'right' });
        sy += line.bold ? 22 : 16;
    });

    const footerY = Math.max(sy + 40, 720);
    doc.moveTo(MARGIN, footerY).lineTo(PAGE_WIDTH - MARGIN, footerY).strokeColor('#d1d5db').lineWidth(1).stroke();
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
        .text('Thank you for shopping with BazaarBuzz!', MARGIN, footerY + 15, { align: 'center', width: CONTENT_WIDTH });

    doc.end();
};

module.exports = { generateInvoicePDF };

const Order = require('../../model/orderModel');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit')
const { PassThrough } = require('stream');

let match = {};

const renderReport = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    try {
        let selectedDate = req.query.selectedDate || null;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (selectedDate) {
            const now = new Date();
            let startDate;

            switch (selectedDate) {
                case 'day': // New daily filter
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    match.createdAt = { $gte: startDate };
                    break;
                case 'week':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                    match.createdAt = { $gte: startDate };
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    match.createdAt = { $gte: startDate };
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                    match.createdAt = { $gte: startDate };
                    break;
                default:
                    return res.status(400).json({ success: false, message: "Invalid date selection." });
            }
        }

        // Count total orders after filtering
        const totalOrders = await Order.countDocuments(match);

        // Fetch filtered orders with pagination
        const orders = await Order.find(match)
            .populate('user')
            .populate('orderedProducts.product')
            .populate('coupon')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const totalPages = Math.ceil(totalOrders / limit);

        res.render('admin/salesReport', {
            orders,
            totalPages,
            currentPage: page,
            limit,
            selectedDate
        });

    } catch (err) {
        console.error(`Error in renderReport : ${err}`);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};


const downloadReport = async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin/signIn');
    try {
        // Fetch orders based on any filters applied
        const orders = await Order.find(match) // Assuming you have 'match' defined for filtering
            .populate('user')
            .populate('orderedProducts.product')
            .populate('coupon');

        // Calculate metrics for the report
        const totalRevenue = orders.reduce((acc, order) =>
            acc + order.orderedProducts.reduce((pAcc, product) => pAcc + product.totalPay, 0),
            0
        );
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

        // Prepare data for Excel
        const excelData = orders.map(order => ({
            OrderID: order._id.toString(),
            UserEmail: order.user.email,
            TotalProducts: order.orderedProducts.length,
            TotalAmount: order.orderedProducts.reduce((acc, product) => acc + product.totalPay, 0),
            CouponDiscount: order.coupon ? order.coupon.couponValue : 'Not applied',
            PaymentStatus: order.allOrdersStatus,
        }));

        // Determine the format based on the request body
        const format = req.query.format; //? Expecting format to be either 'excel' or 'pdf'

        if (format === 'excel') {
            // Create a new workbook for Excel
            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.json_to_sheet(excelData);
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Sales Report');

            // Write the workbook to a buffer
            const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });

            // Set headers for the Excel download
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.end(buffer);
        } else if (format === 'pdf') {
            // Create a PDF document
            const doc = new PDFDocument();

            // Set response headers for the PDF download
            res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
            res.setHeader('Content-Type', 'application/pdf');

            // Pipe the PDF into the response
            doc.pipe(res);

            // Add title and metrics
            doc.fontSize(20).text('Sales Report', { align: 'center' });
            doc.fontSize(12).text(`Total Revenue: $${totalRevenue.toFixed(2)}`);
            doc.text(`Total Orders: ${totalOrders}`);
            doc.text(`Average Order Value: $${averageOrderValue}`);
            doc.moveDown();

            // Draw the table header
            const tableHeader = ['Order ID', 'User Email', 'Total Products', 'Total Amount', 'Coupon Discount', 'Payment Status'];
            const tableWidth = 700; // Total width of the table
            const columnWidth = tableWidth / tableHeader.length;

            const drawHeader = (yStart) => {
                doc.fontSize(10).font('Helvetica-Bold');
                tableHeader.forEach((header, i) => {
                    doc.text(header, 50 + i * columnWidth, yStart, { width: columnWidth, align: 'center' });
                });
                // Draw a line under the header
                doc.moveTo(50, yStart + 10).lineTo(50 + tableWidth, yStart + 10).stroke();
            };

            let yStart = doc.y;
            drawHeader(yStart);
            yStart += 30; // Move down for the data rows

            // Reset font for table body
            doc.font('Helvetica');

            // Add order details to PDF in a table format
            excelData.forEach((item, index) => {
                if (yStart + 20 > doc.page.height - doc.page.margins.bottom) {
                    // Create a new page if there's no room for another row
                    doc.addPage();
                    yStart = doc.y; // Reset yStart for the new page
                    drawHeader(yStart); // Draw header again
                    yStart += 30; // Move down for data rows
                }

                doc.text(item.OrderID, 50, yStart, { width: columnWidth, align: 'center' });
                doc.text(item.UserEmail, 50 + columnWidth, yStart, { width: columnWidth, align: 'center' });
                doc.text(item.TotalProducts, 50 + 2 * columnWidth, yStart, { width: columnWidth, align: 'center' });
                doc.text(`$${item.TotalAmount}`, 50 + 3 * columnWidth, yStart, { width: columnWidth, align: 'center' });
                doc.text(item.CouponDiscount, 50 + 4 * columnWidth, yStart, { width: columnWidth, align: 'center' });
                doc.text(item.PaymentStatus, 50 + 5 * columnWidth, yStart, { width: columnWidth, align: 'center' });

                yStart += 20; // Move to the next line for the next item
            });

            // Finalize PDF file
            doc.end();
        } else {
            return res.status(400).json({ success: false, message: "Invalid format selection." });
        }

    } catch (err) {
        console.error(`Error in downloadReport: ${err}`);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: err.message,
            stack: err.stack,
        });
    }
};

module.exports = {
    downloadReport,
};


module.exports = {
    downloadReport,
    renderReport,
}

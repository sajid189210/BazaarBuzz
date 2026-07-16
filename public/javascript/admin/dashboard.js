(function () {
    'use strict';

    if (typeof dashboardData === 'undefined') return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var palette = ['#e11d48', '#f43f5e', '#fb7185', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];

    var statusColors = { delivered: '#22c55e', processing: '#f59e0b', shipped: '#3b82f6', cancelled: '#ef4444', returned: '#6b7280', partially_delivered: '#6366f1', partially_returned: '#a855f7' };

    var methodColors = { cod: '#22c55e', razorpay: '#3b82f6', wallet: '#f59e0b' };

    function pickColors(n) {
        return n <= palette.length ? palette.slice(0, n) : Array(n).fill('#e11d48');
    }

    (function () {
        const el = document.getElementById('salesRevenue_bar');
        if (!el) return;
        const data = dashboardData.salesData || [];
        if (!data.some(function (v) { return v > 0; })) {
            el.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 text-sm">No sales data</div>';
            return;
        }
        new ApexCharts(el, {
            series: [{ name: 'Revenue', data: data }],
            chart: { type: 'bar', height: 250, toolbar: { show: false } },
            title: { text: 'Monthly Sales Revenue', style: { fontSize: '14px', fontWeight: 600 } },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
            xaxis: { categories: months, labels: { style: { fontSize: '11px' } } },
            yaxis: { labels: { formatter: function (v) { return '\u20B9' + v.toLocaleString('en-IN'); } } },
            colors: ['#e11d48'],
            tooltip: { y: { formatter: function (v) { return '\u20B9' + v.toLocaleString('en-IN'); } } },
            dataLabels: { enabled: false },
            grid: { borderColor: '#f1f1f1' }
        }).render();
    })();


    (function () {
        const el = document.getElementById('salesByBrand');
        if (!el) return;
        const data = dashboardData.revenueByBrand || [];
        if (!data.length) {
            el.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 text-sm">No brand data</div>';
            return;
        }
        new ApexCharts(el, {
            series: data.map(function (b) { return b.totalRevenue; }),
            labels: data.map(function (b) { return b._id; }),
            chart: { type: 'donut', height: 250 },
            title: { text: 'Revenue by Brand', style: { fontSize: '14px', fontWeight: 600 } },
            colors: ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#fce7f3'],
            legend: { position: 'bottom', fontSize: '12px' },
            tooltip: { y: { formatter: function (v) { return '\u20B9' + v.toLocaleString('en-IN'); } } },
            dataLabels: { enabled: false },
            plotOptions: {
                pie: {
                    donut: {
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: function (w) {
                                    var total = w.globals.seriesTotals.reduce(function (a, b) { return a + b; }, 0);
                                    return '\u20B9' + total.toLocaleString('en-IN');
                                }
                            }
                        }
                    }
                }
            }
        }).render();
    })();


    (function () {
        const el = document.getElementById('AOV');
        if (!el) return;
        const data = dashboardData.aovData || [];
        if (!data.length) {
            el.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 text-sm">No AOV data</div>';
            return;
        }
        var sorted = data.slice().sort(function (a, b) {
            return a.year - b.year || a.month - b.month;
        });
        new ApexCharts(el, {
            series: [{
                name: 'Avg Order Value',
                data: sorted.map(function (d) { return Math.round(d.AOV); })
            }],
            chart: { type: 'line', height: 250, toolbar: { show: false } },
            title: { text: 'Average Order Value', style: { fontSize: '14px', fontWeight: 600 } },
            stroke: { curve: 'smooth', width: 3, colors: ['#e11d48'] },
            xaxis: {
                categories: sorted.map(function (d) { return months[d.month - 1] + ' ' + d.year; }),
                labels: { style: { fontSize: '11px' }, rotate: -45 }
            },
            yaxis: { labels: { formatter: function (v) { return '\u20B9' + v.toLocaleString('en-IN'); } } },
            tooltip: { y: { formatter: function (v) { return '\u20B9' + v.toLocaleString('en-IN'); } } },
            dataLabels: { enabled: false },
            grid: { borderColor: '#f1f1f1' },
            markers: { size: 4, colors: ['#e11d48'] }
        }).render();
    })();


    (function () {
        const el = document.getElementById('customerChart');
        if (!el) return;
        var newCust = dashboardData.newCustomer || [];
        var repeatCust = dashboardData.repeatedCustomer || [];
        if (!newCust.length && !repeatCust.length) {
            el.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 text-sm">No customer data</div>';
            return;
        }
        var newMap = {};
        newCust.forEach(function (nc) {
            newMap[nc._id.year + '-' + nc._id.month] = nc.newCustomer;
        });
        var repMap = {};
        repeatCust.forEach(function (rc) {
            repMap[rc.year + '-' + rc.month] = Math.round(rc.repeatRate);
        });
        var allKeys = Object.keys(newMap).concat(Object.keys(repMap));
        allKeys = allKeys.filter(function (k, i) { return allKeys.indexOf(k) === i; }).sort();
        if (!allKeys.length) {
            el.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 text-sm">No customer data</div>';
            return;
        }
        new ApexCharts(el, {
            series: [
                { name: 'New Customers', type: 'column', data: allKeys.map(function (k) { return newMap[k] || 0; }) },
                { name: 'Repeat Rate (%)', type: 'line', data: allKeys.map(function (k) { return repMap[k] || 0; }) }
            ],
            chart: { height: 300, toolbar: { show: false } },
            title: { text: 'Customer Growth', style: { fontSize: '14px', fontWeight: 600 } },
            stroke: { width: [0, 3], curve: 'smooth' },
            colors: ['#e11d48', '#f97316'],
            xaxis: {
                categories: allKeys.map(function (k) {
                    var p = k.split('-');
                    return months[parseInt(p[1]) - 1] + ' ' + p[0];
                }),
                labels: { style: { fontSize: '11px' }, rotate: -45 }
            },
            yaxis: [
                { title: { text: 'New Customers', style: { fontSize: '11px' } } },
                { opposite: true, title: { text: 'Repeat Rate (%)', style: { fontSize: '11px' } }, max: 100, labels: { formatter: function (v) { return v + '%'; } } }
            ],
            tooltip: {
                shared: true,
                y: [
                    { formatter: function (v) { return v + ' customers'; } },
                    { formatter: function (v) { return v + '%'; } }
                ]
            },
            dataLabels: { enabled: false },
            grid: { borderColor: '#f1f1f1' }
        }).render();
    })();


    (function () {
        const el = document.getElementById('topSellingProductChart');
        if (!el) return;
        var products = dashboardData.topProducts || [];
        if (!products.length) {
            el.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 text-sm">No sales data</div>';
            return;
        }
        new ApexCharts(el, {
            series: [{ name: 'Units Sold', data: products.map(function (p) { return p.quantity; }) }],
            chart: { type: 'bar', height: 300, toolbar: { show: false } },
            title: { text: 'Top Selling Products', style: { fontSize: '14px', fontWeight: 600 } },
            plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '70%' } },
            xaxis: { categories: products.map(function (p) { return p.productName; }), labels: { style: { fontSize: '11px' } } },
            colors: ['#e11d48'],
            dataLabels: { enabled: true, formatter: function (v) { return v; }, style: { fontSize: '11px' } },
            grid: { borderColor: '#f1f1f1' }
        }).render();
    })();


    (function () {
        const el = document.getElementById('ordersByStatusChart');
        if (!el) return;
        var data = dashboardData.ordersByStatus || [];
        if (!data.length) {
            el.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 text-sm">No order data</div>';
            return;
        }
        new ApexCharts(el, {
            series: data.map(function (d) { return d.count; }),
            labels: data.map(function (d) { return d._id; }),
            chart: { type: 'donut', height: 250 },
            title: { text: 'Orders by Status', style: { fontSize: '14px', fontWeight: 600 } },
            colors: data.map(function (d) { return statusColors[d._id] || '#9ca3af'; }),
            legend: { position: 'bottom', fontSize: '11px' },
            dataLabels: { enabled: false },
            tooltip: { y: { formatter: function (v) { return v + ' orders'; } } },
            plotOptions: {
                pie: {
                    donut: {
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: function (w) {
                                    return w.globals.seriesTotals.reduce(function (a, b) { return a + b; }, 0) + ' orders';
                                }
                            }
                        }
                    }
                }
            }
        }).render();
    })();

    (function () {
        const el = document.getElementById('paymentMethodSplitChart');
        if (!el) return;
        var data = dashboardData.paymentMethodSplit || [];
        if (!data.length) {
            el.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 text-sm">No payment data</div>';
            return;
        }
        new ApexCharts(el, {
            series: data.map(function (d) { return d.count; }),
            labels: data.map(function (d) { return d._id; }),
            chart: { type: 'donut', height: 250 },
            title: { text: 'Payment Methods', style: { fontSize: '14px', fontWeight: 600 } },
            colors: data.map(function (d) { return methodColors[d._id] || '#9ca3af'; }),
            legend: { position: 'bottom', fontSize: '11px' },
            dataLabels: { enabled: false },
            tooltip: { y: { formatter: function (v) { return v + ' orders'; } } },
            plotOptions: {
                pie: {
                    donut: {
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                formatter: function (w) {
                                    return w.globals.seriesTotals.reduce(function (a, b) { return a + b; }, 0) + ' orders';
                                }
                            }
                        }
                    }
                }
            }
        }).render();
    })();

    (function () {
        const el = document.getElementById('monthlyOrderCountChart');
        if (!el) return;
        var data = dashboardData.monthlyOrderCount || [];
        if (!data.some(function (v) { return v > 0; })) {
            el.innerHTML = '<div class="flex items-center justify-center h-48 text-gray-400 text-sm">No order data</div>';
            return;
        }
        new ApexCharts(el, {
            series: [{ name: 'Orders', data: data }],
            chart: { type: 'bar', height: 250, toolbar: { show: false } },
            title: { text: 'Monthly Orders', style: { fontSize: '14px', fontWeight: 600 } },
            plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
            xaxis: { categories: months, labels: { style: { fontSize: '11px' } } },
            yaxis: { labels: { formatter: function (v) { return v; } } },
            colors: ['#6366f1'],
            tooltip: { y: { formatter: function (v) { return v + ' orders'; } } },
            dataLabels: { enabled: false },
            grid: { borderColor: '#f1f1f1' }
        }).render();
    })();

})();

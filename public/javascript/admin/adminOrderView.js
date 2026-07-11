async function changeOrderStatus(orderId, status) {
    var dataEl = document.getElementById('orderData');
    var itemIds = dataEl ? dataEl.dataset.itemIds.split(',') : [];
    var orderItemId = itemIds[0] || '';
    try {
        var res = await fetch('/admin/order/changeStatus', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderStatus: status, orderId: orderId, orderItemId: orderItemId })
        });
        var data = await res.json();
        if (data.success) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Status updated', showConfirmButton: false, timer: 1500 });
            setTimeout(function () { location.reload(); }, 1500);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to update status', icon: 'error' });
        }
    } catch (e) { console.log(e); }
}

async function approveReturn(orderId) {
    var dataEl = document.getElementById('orderData');
    var itemIds = dataEl ? dataEl.dataset.itemIds.split(',') : [];
    var orderItemId = itemIds[0] || '';
    try {
        var res = await fetch('/admin/order/returns', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderId, orderItemId: orderItemId, status: 'approved' })
        });
        var data = await res.json();
        if (data.success) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Return approved', showConfirmButton: false, timer: 1500 });
            setTimeout(function () { location.reload(); }, 1500);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to approve return', icon: 'error' });
        }
    } catch (e) { console.log(e); }
}
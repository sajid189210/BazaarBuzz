async function changeOrderStatus(orderId, status) {
    try {
        var statusLabels = { shipped: 'Shipped', delivered: 'Delivered' };
        var label = statusLabels[status] || status;
        var res = await fetch('/admin/order/changeStatus', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderStatus: status, orderId: orderId })
        });
        var data = await res.json();
        if (data.success) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Marked as ' + label, showConfirmButton: false, timer: 1500 });
            setTimeout(function () { location.reload(); }, 1500);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to update status', icon: 'error' });
        }
    } catch (e) { console.log(e); }
}

async function confirmCancel(orderId) {
    var result = await Swal.fire({
        title: 'Cancel Order?',
        text: 'This action cannot be undone. The customer will be notified.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        confirmButtonText: 'Yes, cancel order',
        cancelButtonText: 'Go back',
    });
    if (!result.isConfirmed) return;
    changeOrderStatus(orderId, 'cancelled');
}

async function confirmApproveReturn(orderId, orderItemId) {
    var result = await Swal.fire({
        title: 'Approve Return?',
        text: 'This will refund the customer and mark the item as returned.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Yes, approve',
        cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    approveReturn(orderId, orderItemId);
}

async function approveReturn(orderId, orderItemId) {
    if (!orderItemId) {
        var dataEl = document.getElementById('orderData');
        var itemIds = dataEl ? dataEl.dataset.itemIds.split(',') : [];
        orderItemId = itemIds[0] || '';
    }
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
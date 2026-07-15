async function approveReturn(orderId, itemId) {
    var result = await Swal.fire({
        title: 'Approve Return?',
        text: 'This will refund the customer and mark the item as returned.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Yes, approve',
        cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
        var res = await fetch('/admin/order/returns', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderId, orderItemId: itemId, status: 'approved' })
        });
        var data = await res.json();
        if (data.success) {
            if (data.stockWarning) {
                await Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Return approved — stock restore failed', text: 'Check server logs to fix manually', showConfirmButton: false, timer: 4000 });
            } else {
                await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Return approved', showConfirmButton: false, timer: 1500 });
            }
            setTimeout(function () { location.reload(); }, 1500);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to approve return', icon: 'error' });
        }
    } catch (e) {
        Swal.fire({ title: 'Error', text: 'Something went wrong', icon: 'error' });
    }
}

async function rejectReturn(orderId, itemId) {
    var result = await Swal.fire({
        title: 'Reject Return?',
        input: 'textarea',
        inputLabel: 'Reason for rejection',
        inputPlaceholder: 'Explain why the return is being rejected...',
        inputAttributes: { 'aria-label': 'Reason for rejection' },
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        confirmButtonText: 'Reject',
        cancelButtonText: 'Cancel',
        inputValidator: function (value) {
            if (!value || !value.trim()) {
                return 'Please provide a reason';
            }
        }
    });

    if (!result.isConfirmed) return;

    try {
        var res = await fetch('/admin/order/returns', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderId, orderItemId: itemId, status: 'rejected', reason: result.value })
        });
        var data = await res.json();
        if (data.success) {
            await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Return rejected', showConfirmButton: false, timer: 1500 });
            setTimeout(function () { location.reload(); }, 1500);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to reject return', icon: 'error' });
        }
    } catch (e) {
        Swal.fire({ title: 'Error', text: 'Something went wrong', icon: 'error' });
    }
}

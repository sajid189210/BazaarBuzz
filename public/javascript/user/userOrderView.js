async function cancelOrderItem(orderId, orderItemId) {
    const result = await Swal.fire({
        title: 'Cancel this item?',
        text: 'Are you sure you want to cancel this product? A refund will be credited to your wallet if eligible.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e53e3e',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, cancel',
        cancelButtonText: 'Go back',
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch('/user/orders/cancel', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, orderItemId }),
        });

        const data = await res.json();

        if (data.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Cancelled',
                text: data.message || 'Item cancelled successfully.',
                timer: 2000,
                showConfirmButton: false,
            });
            location.reload();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to cancel item.' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong. Please try again.' });
    }
}

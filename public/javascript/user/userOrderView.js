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

async function retryPayment(orderId) {
    var btn = document.getElementById('retryBtn');
    btn.disabled = true;
    btn.innerHTML = 'Processing... <i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        var res = await fetch('/user/orders/retryPayment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        });
        var data = await res.json();
        if (!data.success) {
            await Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to initiate payment.' });
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Retry Payment';
            return;
        }

        var options = {
            key: data.RAZORPAY_KEY_ID,
            amount: data.amount,
            currency: data.currency || 'INR',
            order_id: data.razorPayOrderId,
            name: 'BazaarBuzz',
            handler: async function (response) {
                var verifyRes = await fetch('/user/orders/verifyRetryPayment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpayOrderId: response.razorpay_order_id,
                        signature: response.razorpay_signature,
                        orderId: orderId
                    })
                });
                var verifyData = await verifyRes.json();
                if (verifyData.success) {
                    await Swal.fire({ icon: 'success', title: 'Payment Successful', timer: 1500, showConfirmButton: false });
                    location.reload();
                } else {
                    await Swal.fire({ icon: 'error', title: 'Payment Failed', text: verifyData.message || 'Verification failed.' });
                }
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Retry Payment';
            },
            modal: {
                ondismiss: function () {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Retry Payment';
                }
            },
            onerror: function (err) {
                var msg = err.error && err.error.description ? err.error.description : 'Payment failed. Please try again.';
                Swal.fire({ icon: 'error', title: 'Payment Error', text: msg });
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Retry Payment';
            }
        };
        var rzp = new Razorpay(options);
        rzp.open();
    } catch (e) {
        console.log(e);
        await Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong. Please try again.' });
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Retry Payment';
    }
}

async function requestReturn(orderId, orderItemId) {
    var result = await Swal.fire({
        title: 'Request Return',
        input: 'textarea',
        inputLabel: 'Reason for return',
        inputPlaceholder: 'Tell us why you want to return this item...',
        inputAttributes: { 'aria-label': 'Reason for return' },
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'Submit Request',
        cancelButtonText: 'Go back',
        inputValidator: function (value) {
            if (!value || !value.trim()) {
                return 'Please provide a reason';
            }
        }
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch('/user/orders/return', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, orderItemId, reason: result.value }),
        });

        const data = await res.json();

        if (data.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Return Requested',
                text: data.message || 'Your return request has been submitted.',
                timer: 2000,
                showConfirmButton: false,
            });
            location.reload();
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to submit return request.' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong. Please try again.' });
    }
}

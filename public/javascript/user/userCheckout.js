async function applyCoupon() {
    const code = document.getElementById('couponCode').value.trim();
    const msg = document.getElementById('couponMessage');
    if (!code) { msg.textContent = 'Please enter a coupon code'; msg.className = 'mt-2 text-xs text-red-500'; return; }
    try {
        const res = await fetch('/user/checkout/applyCoupon', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputValue: code })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('couponDiscountRow').classList.remove('hidden');
            document.getElementById('couponDiscountAmount').textContent = data.couponDiscount.toLocaleString();
            var baseTotal = parseFloat(document.getElementById('checkoutTotal').dataset.total);
            var newTotal = baseTotal - data.couponDiscount;
            document.getElementById('checkoutTotal').textContent = '₹' + newTotal.toLocaleString();
            document.getElementById('checkoutTotal').dataset.total = newTotal.toFixed(2);
            msg.textContent = 'Coupon applied!';
            msg.className = 'mt-2 text-xs text-green-600';
        } else {
            msg.textContent = data.message || 'Invalid coupon';
            msg.className = 'mt-2 text-xs text-red-500';
        }
    } catch (e) { console.log(e); msg.textContent = 'Error applying coupon'; msg.className = 'mt-2 text-xs text-red-500'; }
}

async function placeOrder() {
    const selectedAddress = document.querySelector('input[name="address"]:checked');
    const selectedPayment = document.querySelector('input[name="paymentMethod"]:checked');
    if (!selectedAddress) { await Swal.fire({ title: 'Error', text: 'Please select a delivery address', icon: 'warning' }); return; }
    if (!selectedPayment) { await Swal.fire({ title: 'Error', text: 'Please select a payment method', icon: 'warning' }); return; }

    try {
        const res = await fetch('/user/checkout/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addressId: selectedAddress.value, paymentMethod: selectedPayment.value })
        });
        const data = await res.json();
        if (!data.success) {
            await Swal.fire({ title: 'Error', text: data.message, icon: 'error' });
            return;
        }

        if (data.orderType === 'razorpay') {
            const options = {
                key: data.RAZORPAY_KEY_ID,
                amount: data.amount,
                currency: data.currency || 'INR',
                order_id: data.razorpayOrderId,
                name: 'BazaarBuzz',
                handler: async function (response) {
                    const verifyRes = await fetch('/user/checkout/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpayOrderId: response.razorpay_order_id,
                            signature: response.razorpay_signature,
                            orderId: data.newOrderId
                        })
                    });
                    const verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        window.location.href = '/user/checkout/orderSummary/' + data.newOrderId;
                    } else {
                        await Swal.fire({ title: 'Payment Failed', text: verifyData.message, icon: 'error' });
                        await fetch('/user/checkout/paymentFail', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ newOrderId: data.newOrderId })
                        });
                        window.location.href = '/user/checkout/orderSummary/' + data.newOrderId;
                    }
                },
                modal: {
                    ondismiss: async function () {
                        await fetch('/user/checkout/paymentFail', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ newOrderId: data.newOrderId })
                        });
                        window.location.href = '/user/checkout/orderSummary/' + data.newOrderId;
                    }
                },
                onerror: function (err) {
                    console.error('Razorpay error:', err);
                }
            };
            var rzp = new Razorpay(options);
            rzp.open();
        } else {
            window.location.href = '/user/checkout/orderSummary/' + data.newOrderId;
        }
    } catch (e) { console.log(e); alert('Error placing order'); }
}

function openCreateCouponModal() {
    Swal.fire({ title: 'Create Coupon', html: `<input id="swal-code" class="swal2-input" placeholder="Coupon Code"><select id="swal-type" class="swal2-input"><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select><input id="swal-value" class="swal2-input" placeholder="Value" type="number"><input id="swal-expiry" class="swal2-input" placeholder="Expiry (YYYY-MM-DD)" type="date"><input id="swal-count" class="swal2-input" placeholder="Usage limit" type="number">`, showCancelButton: true, confirmButtonText: 'Create', preConfirm: () => ({ couponCode: document.getElementById('swal-code').value, couponType: document.getElementById('swal-type').value, couponValue: document.getElementById('swal-value').value, expiry: document.getElementById('swal-expiry').value, count: document.getElementById('swal-count').value }) }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch('/admin/coupon/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.value) });
            const data = await res.json();
            if (data.success) { Swal.fire({ title: 'Success', text: data.message, icon: 'success' }); setTimeout(() => location.reload(), 1000); }
            else alert(data.message);
        } catch (e) { console.log(e); alert('Error'); }
    });
}

async function editCoupon(id) {
    Swal.fire({ title: 'Edit Coupon', input: 'text', inputLabel: 'New Value', showCancelButton: true, confirmButtonText: 'Save', inputValidator: (v) => !v && 'Required' }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`/admin/coupon/update/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ couponValue: result.value }) });
            const data = await res.json();
            if (data.success) { Swal.fire({ title: 'Success', text: data.message, icon: 'success' }); setTimeout(() => location.reload(), 1000); }
            else alert(data.message);
        } catch (e) { console.log(e); }
    });
}

async function deleteCoupon(id) {
    try {
        const { isConfirmed } = await Swal.fire({ title: 'Delete?', text: 'Delete this coupon?', icon: 'warning', showCancelButton: true });
        if (!isConfirmed) return;
        const res = await fetch(`/admin/coupon/delete/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (data.success) { Swal.fire({ title: 'Success', text: data.message, icon: 'success' }); setTimeout(() => location.reload(), 1000); }
        else alert(data.message);
    } catch (e) { console.log(e); }
}

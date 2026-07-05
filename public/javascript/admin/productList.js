async function toggleProduct(productId) {
    try {
        const { isConfirmed } = await Swal.fire({ title: 'Toggle Status?', text: 'Change the product listing status?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'No' });
        if (!isConfirmed) return;
        const res = await fetch('/admin/status', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
        const data = await res.json();
        if (data.success) { Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }).fire({ icon: 'success', title: data.message }); setTimeout(() => location.reload(), 1200); }
        else alert(data.message);
    } catch (e) { console.log(e); }
}

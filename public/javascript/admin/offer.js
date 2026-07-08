function openCreateOfferModal() {
    Swal.fire({ title: 'Create Offer', html: `<input id="swal-offerName" class="swal2-input" placeholder="Offer Name"><input id="swal-brandName" class="swal2-input" placeholder="Brand Name"><input id="swal-discount" class="swal2-input" placeholder="Discount %" type="number">`, showCancelButton: true, confirmButtonText: 'Create', preConfirm: () => ({ offerName: document.getElementById('swal-offerName').value, brandName: document.getElementById('swal-brandName').value, discount: document.getElementById('swal-discount').value }) }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch('/admin/offer/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.value) });
            const data = await res.json();
            if (data.success) { Swal.fire({ title: 'Success', text: data.message, icon: 'success' }); setTimeout(() => location.reload(), 1000); }
            else alert(data.message);
        } catch (e) { console.log(e); alert('Error'); }
    });
}

async function editOffer(id) {
    Swal.fire({ title: 'Edit Offer', input: 'text', inputLabel: 'Discount %', showCancelButton: true, confirmButtonText: 'Save', inputValidator: (v) => !v && 'Required' }).then(async (result) => {
        if (!result.isConfirmed) return;
        try {
            const res = await fetch(`/admin/offer/update/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ discount: result.value }) });
            const data = await res.json();
            if (data.success) { Swal.fire({ title: 'Success', text: data.message, icon: 'success' }); setTimeout(() => location.reload(), 1000); }
            else alert(data.message);
        } catch (e) { console.log(e); }
    });
}

async function toggleOffer(id) {
    try {
        const { isConfirmed } = await Swal.fire({ title: 'Toggle?', text: 'Toggle offer status?', icon: 'warning', showCancelButton: true });
        if (!isConfirmed) return;
        const res = await fetch(`/admin/offer/toggle/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (data.success) { Swal.fire({ title: 'Success', text: data.message, icon: 'success' }); setTimeout(() => location.reload(), 1000); }
        else alert(data.message);
    } catch (e) { console.log(e); }
}

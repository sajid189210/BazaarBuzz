const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });

function openAddressModal(reset = true) {
    document.getElementById('addressModal').classList.remove('hidden');
    if (!reset) return;
    document.getElementById('addressModalTitle').textContent = 'Add Address';
    document.getElementById('addressId').value = '';
    document.getElementById('addressForm').reset();
}

function closeAddressModal() {
    document.getElementById('addressModal').classList.add('hidden');
}

async function editAddress(addressId) {
    try {
        const res = await fetch(`/user/address/${addressId}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        if (!data.success) { Toast.fire({ icon: 'error', title: data.message }); return; }
        const addr = data.address;
        document.getElementById('addressModalTitle').textContent = 'Edit Address';
        document.getElementById('addressId').value = addr._id;
        document.getElementById('contactName').value = addr.contactName || '';
        document.getElementById('contactNumber').value = addr.contactNumber || '';
        document.getElementById('pincode').value = addr.pincode || '';
        document.getElementById('building').value = addr.building || '';
        document.getElementById('street').value = addr.street || '';
        document.getElementById('landmark').value = addr.landmark || '';
        document.getElementById('district').value = addr.district || '';
        document.getElementById('state').value = addr.state || '';
        openAddressModal(false);
    } catch (e) { console.log(e); Toast.fire({ icon: 'error', title: 'Error fetching address' }); }
}

async function deleteAddress(addressId) {
    try {
        const { isConfirmed } = await Swal.fire({ title: 'Remove?', text: 'Remove this address?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'No' });
        if (!isConfirmed) return;
        const res = await fetch(`/user/address/${addressId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (data.success) { Toast.fire({ icon: 'success', title: data.message }); setTimeout(() => location.reload(), 1500); }
        else Toast.fire({ icon: 'error', title: data.message });
    } catch (e) { console.log(e); }
}

document.getElementById('addressForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const addressId = formData.get('addressId');
    formData.delete('addressId');
    const formInputs = Object.fromEntries(formData);
    const url = addressId ? `/user/address/${addressId}` : '/user/address';
    const method = addressId ? 'PATCH' : 'POST';
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ formInputs }) });
        const data = await res.json();
        if (data.success) { Toast.fire({ icon: 'success', title: data.message }); setTimeout(() => location.reload(), 1500); }
        else Toast.fire({ icon: 'error', title: data.message });
    } catch (e) { console.log(e); Toast.fire({ icon: 'error', title: 'Error saving address' }); }
});
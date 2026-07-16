document.getElementById('profileForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const body = Object.fromEntries(formData);
    try {
        const res = await fetch('/user/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (data.success) {
            Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }).fire({ icon: 'success', title: data.message });
            setTimeout(() => location.reload(), 1500);
        } else {
            alert(data.message);
        }
    } catch (e) { console.log(e); alert('Error updating profile'); }
});

document.getElementById('passwordForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const body = Object.fromEntries(formData);
    try {
        const res = await fetch('/user/changePassword', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (data.success) {
            Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }).fire({ icon: 'success', title: data.message });
            setTimeout(() => location.reload(), 1500);
        } else {
            alert(data.message);
        }
    } catch (e) { console.log(e); alert('Error updating password'); }
});

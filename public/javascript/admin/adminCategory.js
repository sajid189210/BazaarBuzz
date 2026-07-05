function openCategoryModal() {
    document.getElementById('categoryModal').classList.remove('hidden');
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryForm').reset();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.add('hidden');
}

function editCategory(id, title, brandName) {
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryId').value = id;
    document.getElementById('categoryTitle').value = title;
    document.getElementById('brandName').value = brandName || '';
    document.getElementById('categoryModal').classList.remove('hidden');
}

async function toggleCategory(id) {
    try {
        const { isConfirmed } = await Swal.fire({
            title: 'Toggle Status?',
            text: 'Change the category status?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes',
            cancelButtonText: 'No'
        });
        if (!isConfirmed) return;
        const res = await fetch(`/admin/categoryStatus/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const data = await res.json();
        if (data.success) {
            Swal.fire({ title: 'Success', text: 'Status updated', icon: 'success' });
            setTimeout(() => location.reload(), 1000);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to update status', icon: 'error' });
        }
    } catch (e) { console.log(e); }
}

async function deleteCategory(id) {
    try {
        const { isConfirmed } = await Swal.fire({
            title: 'Delete Category?',
            text: 'This action cannot be undone. All brands under this category will be removed.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Delete',
            confirmButtonColor: '#e53e3e',
            cancelButtonText: 'Cancel'
        });
        if (!isConfirmed) return;
        const res = await fetch(`/admin/category/delete/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            Swal.fire({ title: 'Deleted', text: 'Category deleted successfully', icon: 'success' });
            setTimeout(() => location.reload(), 1000);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to delete category', icon: 'error' });
        }
    } catch (e) { console.log(e); }
}

document.getElementById('categoryForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const categoryId = formData.get('categoryId');
    const title = formData.get('title');
    const brandName = formData.get('brandName');
    const url = categoryId ? '/admin/category/update' : '/admin/category/create';
    const method = categoryId ? 'PATCH' : 'POST';
    try {
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId, title, brandName }) });
        const data = await res.json();
        if (data.success) {
            Swal.fire({ title: 'Success', text: data.message, icon: 'success' });
            setTimeout(() => location.reload(), 1000);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to save category', icon: 'error' });
        }
    } catch (e) { console.log(e); }
});

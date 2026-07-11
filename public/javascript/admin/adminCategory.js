function addBrand(name) {
    var input = document.getElementById('brandInput');
    var list = document.getElementById('brandList');
    if (!name) {
        name = input.value.trim();
        if (!name) return;
        input.value = '';
        input.focus();
    }
    var wrapper = document.createElement('span');
    wrapper.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 brand-badge';
    wrapper.dataset.name = name;
    wrapper.innerHTML = name + '<button type="button" onclick="removeBrand(this)" class="text-indigo-400 hover:text-indigo-700 font-bold leading-none ml-0.5">&times;</button>';
    list.appendChild(wrapper);
}

function removeBrand(btn) {
    btn.parentElement.remove();
}

function openCategoryModal() {
    document.getElementById('categoryModal').classList.remove('hidden');
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryForm').reset();
    document.getElementById('brandList').innerHTML = '';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.add('hidden');
}

function editCategory(id, title, brandName) {
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryId').value = id;
    document.getElementById('categoryTitle').value = title;
    document.getElementById('brandList').innerHTML = '';
    if (brandName) {
        brandName.split(',').forEach(function (b) {
            var name = b.trim();
            if (name) addBrand(name);
        });
    }
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
        const res = await fetch('/admin/categoryStatus/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const data = await res.json();
        if (data.success) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Status updated', showConfirmButton: false, timer: 1500 });
            setTimeout(function () { location.reload(); }, 1500);
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
        const res = await fetch('/admin/category/delete/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Category deleted successfully', showConfirmButton: false, timer: 1500 });
            setTimeout(function () { location.reload(); }, 1500);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to delete category', icon: 'error' });
        }
    } catch (e) { console.log(e); }
}

document.getElementById('categoryForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    var title = document.getElementById('categoryTitle').value.trim();
    var categoryId = document.getElementById('categoryId').value;
    var badges = document.querySelectorAll('#brandList .brand-badge');
    var brands = [];
    badges.forEach(function (b) { brands.push(b.dataset.name); });
    var brandName = brands.join(',');
    if (!title || !brandName) {
        Swal.fire({ title: 'Error', text: 'Title and at least one brand are required.', icon: 'error' });
        return;
    }
    var url = categoryId ? '/admin/category/update' : '/admin/category/create';
    var method = categoryId ? 'PATCH' : 'POST';
    try {
        const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId: categoryId, title: title, brandName: brandName }) });
        const data = await res.json();
        if (data.success) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: data.message, showConfirmButton: false, timer: 1500 });
            setTimeout(function () { location.reload(); }, 1500);
        } else {
            Swal.fire({ title: 'Error', text: data.message || 'Failed to save category', icon: 'error' });
        }
    } catch (e) { console.log(e); }
});

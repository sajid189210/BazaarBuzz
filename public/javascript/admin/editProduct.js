let cropper = null;
let uploadQueue = [];
let uploading = false;

// ---- Validation ----
document.getElementById('productDetailForm')?.addEventListener('submit', function (e) {
    clearErrors();
    let errors = [];

    function setError(id, msg) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('border-red-500');
            const errSpan = el.parentElement.querySelector('.error-msg');
            if (errSpan) {
                errSpan.textContent = msg;
                errSpan.classList.remove('hidden');
            }
        }
        errors.push(msg);
    }

    const name = document.getElementById('productName')?.value.trim();
    const brand = document.getElementById('brand')?.value.trim();
    const category = document.getElementById('category')?.value;
    const price = document.getElementById('productPrice')?.value;
    const stock = document.getElementById('stock')?.value;
    const discount = document.getElementById('discount')?.value;
    const description = document.getElementById('productDescription')?.value.trim();
    const sizes = document.querySelectorAll('input[name="size"]:checked');
    const uploadedUrls = document.querySelectorAll('input[name="images[]"]');

    if (!name || name.length < 3) setError('productName', 'Product name must be at least 3 characters.');
    if (!brand) setError('brand', 'Brand is required.');
    if (!category) setError('category', 'Please select a category.');
    if (!price || Number(price) <= 0) setError('productPrice', 'Price must be greater than 0.');
    if (price && Number(price) > 10000) setError('productPrice', 'Price cannot exceed ₹10,000.');
    if (stock === '' || Number(stock) < 0 || isNaN(Number(stock))) setError('stock', 'Stock must be 0 or more.');
    if (discount && (Number(discount) < 0 || Number(discount) > 100)) setError('discount', 'Discount must be between 0 and 100.');
    if (!description || description.length < 20) setError('productDescription', 'Description must be at least 20 characters.');
    if (sizes.length === 0) {
        const sc = document.querySelector('.sizes-wrapper');
        if (sc) {
            const errSpan = sc.querySelector('.error-msg');
            if (errSpan) {
                errSpan.textContent = 'At least one variant is required.';
                errSpan.classList.remove('hidden');
            }
        }
        errors.push('At least one variant is required.');
    }
    if (!uploadedUrls || uploadedUrls.length === 0) setError('images', 'Upload at least one product image.');

    if (errors.length > 0) {
        e.preventDefault();
        Swal.fire({ title: 'Please fix errors', text: errors[0], icon: 'warning', confirmButtonText: 'Ok' });
    }
});

function clearErrors() {
    document.querySelectorAll('.error-msg').forEach(el => {
        el.classList.add('hidden');
        el.textContent = '';
    });
    document.querySelectorAll('.border-red-500').forEach(el => {
        el.classList.remove('border-red-500');
    });
}

document.querySelectorAll('#productDetailForm input, #productDetailForm select, #productDetailForm textarea').forEach(el => {
    el.addEventListener('input', function () {
        this.classList.remove('border-red-500');
        const errSpan = this.parentElement.querySelector('.error-msg');
        if (errSpan) {
            errSpan.classList.add('hidden');
            errSpan.textContent = '';
        }
    });
});

// ---- Color management ----
document.getElementById('addColor')?.addEventListener('click', function () {
    const container = document.getElementById('colorContainer');
    const row = container.querySelector('.color-row');
    const clone = row.cloneNode(true);
    clone.querySelector('input[type="color"]').value = '#000000';
    const removeBtn = clone.querySelector('.remove-color');
    removeBtn.addEventListener('click', function () {
        if (document.querySelectorAll('.color-row').length > 1) {
            clone.remove();
        }
    });
    container.appendChild(clone);
});

document.querySelectorAll('.remove-color').forEach(function (btn) {
    btn.addEventListener('click', function () {
        if (document.querySelectorAll('.color-row').length > 1) {
            this.closest('.color-row').remove();
        }
    });
});

// ---- Remove existing images ----
document.querySelectorAll('.remove-existing-image').forEach(function (btn) {
    btn.addEventListener('click', function () {
        const wrapper = this.closest('.relative');
        wrapper.querySelector('input[type="hidden"]').remove();
        wrapper.remove();
    });
});

// ---- Image cropping ----
document.getElementById('images')?.addEventListener('change', function () {
    const files = Array.from(this.files);
    if (files.length === 0) return;
    uploadQueue = files;
    this.value = '';
    processNextImage();
});

function processNextImage() {
    if (uploadQueue.length === 0 || uploading) return;
    uploading = true;

    const file = uploadQueue.shift();
    const reader = new FileReader();
    reader.onload = function (e) {
        showCropper(e.target.result);
    };
    reader.readAsDataURL(file);
}

function showCropper(src) {
    const img = document.getElementById('cropImage');
    if (cropper) { cropper.destroy(); cropper = null; }

    document.getElementById('cropperModal').classList.remove('hidden');
    document.getElementById('cropperModal').classList.add('flex');

    img.onload = function () {
        cropper = new Cropper(img, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1
        });
    };
    img.onerror = function () {
        Swal.fire({ title: 'Error', text: 'Failed to load image for cropping.', icon: 'error' });
        closeCropperModal();
        uploading = false;
        processNextImage();
    };
    img.src = src;
}

document.getElementById('confirmCrop')?.addEventListener('click', function () {
    if (!cropper) return;

    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Uploading...';

    cropper.getCroppedCanvas({ width: 800, height: 800 }).toBlob(function (blob) {
        const fd = new FormData();
        fd.append('croppedImage', blob, 'product.jpg');

        fetch('/admin/uploadImage', { method: 'POST', body: fd })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.success && data.imageUrl) {
                    addImagePreview(data.imageUrl);
                } else {
                    Swal.fire({ title: 'Upload failed', text: 'Failed to upload image.', icon: 'error' });
                }
                closeCropperModal();
                btn.disabled = false;
                btn.textContent = 'Crop & Upload';
                uploading = false;
                processNextImage();
            })
            .catch(function () {
                Swal.fire({ title: 'Upload failed', text: 'Network error.', icon: 'error' });
                closeCropperModal();
                btn.disabled = false;
                btn.textContent = 'Crop & Upload';
                uploading = false;
                processNextImage();
            });
    });
});

function addImagePreview(url) {
    const container = document.getElementById('imagePreview');

    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'images[]';
    hidden.value = url;
    document.getElementById('productDetailForm').appendChild(hidden);

    const wrapper = document.createElement('div');
    wrapper.className = 'relative group';

    const img = document.createElement('img');
    img.src = url;
    img.className = 'w-24 h-24 object-cover rounded-lg border border-gray-200';
    img.alt = 'Product image';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Remove image';
    removeBtn.addEventListener('click', function () {
        hidden.remove();
        wrapper.remove();
    });

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
}

function closeCropperModal() {
    document.getElementById('cropperModal').classList.add('hidden');
    document.getElementById('cropperModal').classList.remove('flex');
    if (cropper) { cropper.destroy(); cropper = null; }
}

document.getElementById('closeCropper')?.addEventListener('click', closeCropperModal);
document.getElementById('cancelCrop')?.addEventListener('click', function () {
    uploading = false;
    uploadQueue = [];
    closeCropperModal();
});

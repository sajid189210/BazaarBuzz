let cropper = null;
let uploadQueue = [];
let uploading = false;

// ---- Brand Dropdown Management ----
const categorySelect = document.getElementById('category');
const brandSelect = document.getElementById('brand');

async function fetchBrandsForCategory(categoryId) {
    if (!categoryId) {
        brandSelect.innerHTML = '<option value="">Select category first</option>';
        brandSelect.disabled = true;
        brandSelect.classList.add('opacity-50', 'cursor-not-allowed');
        return;
    }

    try {
        const response = await fetch(`/admin/fetchCategory/${categoryId}`);
        const data = await response.json();

        if (data.success && data.category && data.category.brands) {
            const brands = data.category.brands;
            brandSelect.innerHTML = '<option value="">Select brand</option>';
            brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                brandSelect.appendChild(option);
            });
            brandSelect.disabled = false;
            brandSelect.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            brandSelect.innerHTML = '<option value="">No brands available</option>';
            brandSelect.disabled = true;
            brandSelect.classList.add('opacity-50', 'cursor-not-allowed');
        }
    } catch (error) {
        console.error('Error fetching brands:', error);
        brandSelect.innerHTML = '<option value="">Error loading brands</option>';
        brandSelect.disabled = true;
        brandSelect.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// Category change handler
categorySelect?.addEventListener('change', function () {
    const categoryId = this.value;
    fetchBrandsForCategory(categoryId);
});

// ---- Validation ----
var clientErrors = [];

function setError(id, msg) {
    var el = document.getElementById(id);
    if (el) {
        el.classList.add('border-red-500');
        var errSpan = el.parentElement.querySelector('.error-msg');
        if (errSpan) {
            errSpan.textContent = msg;
            errSpan.classList.remove('hidden');
        }
    }
    clientErrors.push(msg);
}

function setVariantError(variantRow, fieldName, msg) {
    var field = variantRow.querySelector('[name*="' + fieldName + '"]');
    if (field) {
        field.classList.add('border-red-500');
        var errSpan = field.parentElement.querySelector('.error-msg');
        if (errSpan) {
            errSpan.textContent = msg;
            errSpan.classList.remove('hidden');
        }
    }
    clientErrors.push(msg);
}

function showServerErrors(errors) {
    Object.keys(errors).forEach(function (field) {
        var msg = errors[field];
        if (field.indexOf('variants.') === 0) {
            var parts = field.split('.');
            var variantIndex = parseInt(parts[1], 10);
            var subField = parts.slice(2).join('.');
            var variantRows = document.querySelectorAll('.variant-row');
            if (variantRows[variantIndex]) {
                if (subField === 'colors') {
                    setVariantError(variantRows[variantIndex], 'colors', msg);
                } else {
                    setVariantError(variantRows[variantIndex], subField, msg);
                }
            }
        } else if (field.indexOf('images') === 0) {
            setError('images', msg);
        } else if (field === 'variants') {
            var errSpan = document.getElementById('variantsError');
            if (errSpan) {
                errSpan.textContent = msg;
                errSpan.classList.remove('hidden');
            }
        } else {
            setError(field, msg);
        }
    });
}

document.getElementById('productDetailForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    clientErrors = [];

    var name = document.getElementById('productName')?.value.trim();
    var brand = document.getElementById('brand')?.value.trim();
    var category = document.getElementById('category')?.value;
    var price = document.getElementById('productPrice')?.value;
    var discount = document.getElementById('discount')?.value;
    var gender = document.getElementById('gender')?.value;
    var fabric = document.getElementById('fabric')?.value.trim();
    var description = document.getElementById('productDescription')?.value.trim();
    var uploadedUrls = document.querySelectorAll('input[name="images[]"]');

    if (!name || name.length < 3) setError('productName', 'Product name must be at least 3 characters.');
    if (!brand) setError('brand', 'Brand is required.');
    if (!category) setError('category', 'Please select a category.');
    if (!price || Number(price) <= 0) setError('productPrice', 'Price must be greater than 0.');
    if (price && Number(price) > 10000) setError('productPrice', 'Price cannot exceed ₹10,000.');
    if (discount && (Number(discount) < 0 || Number(discount) > 100)) setError('discount', 'Discount must be between 0 and 100.');
    if (!gender) setError('gender', 'Please select a gender.');
    if (!fabric) setError('fabric', 'Fabric information is required.');
    if (!description || description.length < 20) setError('productDescription', 'Description must be at least 20 characters.');
    if (!uploadedUrls || uploadedUrls.length === 0) setError('images', 'Upload at least one product image.');

    var variantRows = document.querySelectorAll('.variant-row');
    if (variantRows.length === 0) {
        var errSpan = document.getElementById('variantsError');
        if (errSpan) {
            errSpan.textContent = 'At least one variant is required.';
            errSpan.classList.remove('hidden');
        }
        clientErrors.push('At least one variant is required.');
    } else {
        var usedSizes = new Set();
        variantRows.forEach(function (row) {
            var sizeSelect = row.querySelector('.variant-size');
            var stockInput = row.querySelector('.variant-stock');
            var colorInputs = row.querySelectorAll('.variant-colors input[type="color"]');

            var size = sizeSelect?.value;
            var stock = stockInput?.value;
            var colors = Array.from(colorInputs).map(function (input) { return input.value; });

            if (!size) {
                setVariantError(row, 'size', 'Size is required for each variant.');
            } else if (usedSizes.has(size)) {
                setVariantError(row, 'size', 'Duplicate size: ' + size + '. Each variant must have a unique size.');
            } else {
                usedSizes.add(size);
            }

            if (stock === '' || Number(stock) < 0 || isNaN(Number(stock))) {
                setVariantError(row, 'stock', 'Stock must be 0 or more.');
            }

            if (colors.length === 0) {
                setVariantError(row, 'colors', 'At least one color is required for each variant.');
            }
        });
    }

    if (clientErrors.length > 0) {
        Swal.fire({ title: 'Please fix errors', text: clientErrors[0], icon: 'warning', confirmButtonText: 'Ok' });
        return;
    }

    var form = this;
    var formData = new URLSearchParams(new FormData(form));

    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: formData.toString()
    })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.success && data.redirectUrl) {
                window.location.href = data.redirectUrl;
            } else if (data.errors) {
                showServerErrors(data.errors);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create Product';
                }
                Swal.fire({ title: 'Please fix errors', text: data.message || 'Please correct the highlighted fields.', icon: 'warning', confirmButtonText: 'Ok' });
            } else if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
            }

        })
        .catch(function () {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Product';
            }
            Swal.fire({ title: 'Error', text: 'Something went wrong. Please try again.', icon: 'error', confirmButtonText: 'Ok' });
        });
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

// ---- Variant Management ----
const variantTemplate = document.getElementById('variantTemplate');
const variantsContainer = document.getElementById('variantsContainer');
const addVariantBtn = document.getElementById('addVariant');

function addVariantRow(data = {}) {
    const clone = variantTemplate.content.cloneNode(true);
    const variantRow = clone.querySelector('.variant-row');

    // Get the current index for this variant
    const variantIndex = document.querySelectorAll('.variant-row').length;

    // Replace __INDEX__ placeholder with actual index in all name attributes
    const inputs = variantRow.querySelectorAll('[name*="__INDEX__"]');
    inputs.forEach(input => {
        input.name = input.name.replace('__INDEX__', variantIndex);
    });

    // Set size if provided
    if (data.size) {
        const sizeSelect = variantRow.querySelector('.variant-size');
        sizeSelect.value = data.size;
    }

    // Set stock if provided
    if (data.stock !== undefined) {
        const stockInput = variantRow.querySelector('.variant-stock');
        stockInput.value = data.stock;
    }

    // Set colors if provided
    if (data.colors && data.colors.length > 0) {
        const colorsContainer = variantRow.querySelector('.variant-colors');
        colorsContainer.innerHTML = ''; // Clear default
        data.colors.forEach((color, index) => {
            const colorRow = createColorRow(variantIndex, color);
            colorsContainer.appendChild(colorRow);
        });
    }

    // Add remove variant handler
    const removeBtn = variantRow.querySelector('.remove-variant');
    removeBtn.addEventListener('click', function () {
        if (document.querySelectorAll('.variant-row').length > 1) {
            variantRow.remove();
            // Re-index remaining variants
            reindexVariants();
        } else {
            // If it's the last one, just clear it
            variantRow.querySelector('.variant-size').value = '';
            variantRow.querySelector('.variant-stock').value = '0';
            const colorsContainer = variantRow.querySelector('.variant-colors');
            colorsContainer.innerHTML = '';
            colorsContainer.appendChild(createColorRow(variantIndex, '#000000'));
        }
    });

    // Add color handlers
    const addColorBtn = variantRow.querySelector('.add-color');
    addColorBtn.addEventListener('click', function () {
        const colorsContainer = variantRow.querySelector('.variant-colors');
        colorsContainer.appendChild(createColorRow(variantIndex, '#000000'));
    });

    variantRow.querySelectorAll('.remove-color').forEach(btn => {
        btn.addEventListener('click', function () {
            const colorRows = variantRow.querySelectorAll('.color-row');
            if (colorRows.length > 1) {
                this.closest('.color-row').remove();
            }
        });
    });

    variantsContainer.appendChild(variantRow);
}

function reindexVariants() {
    const variantRows = document.querySelectorAll('.variant-row');
    variantRows.forEach((row, index) => {
        row.dataset.index = index;
        // Update all name attributes in this row
        const inputs = row.querySelectorAll('[name*="variants["]');
        inputs.forEach(input => {
            // Replace the index in the name attribute
            input.name = input.name.replace(/variants\[\d+\]/, `variants[${index}]`);
        });
    });
}

function createColorRow(variantIndex, color = '#000000') {
    const wrapper = document.createElement('div');
    wrapper.className = 'color-swatch-wrapper';

    // Hidden native color input (for the picker dialog)
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.name = `variants[${variantIndex}][colors][]`;
    colorInput.value = color;
    colorInput.className = 'color-swatch-input';
    colorInput.required = true;

    // Visible swatch button
    const swatchBtn = document.createElement('button');
    swatchBtn.type = 'button';
    swatchBtn.className = 'color-swatch-btn';
    swatchBtn.style.backgroundColor = color;
    swatchBtn.title = color;
    swatchBtn.addEventListener('click', function () {
        colorInput.click();
    });

    // Color name label (using ntc.js)
    const colorNameSpan = document.createElement('span');
    colorNameSpan.className = 'color-swatch-name';
    const ntcMatch = ntc.name(color);
    colorNameSpan.textContent = ntcMatch[1] || color;

    // Update swatch when color changes
    colorInput.addEventListener('input', function () {
        swatchBtn.style.backgroundColor = this.value;
        swatchBtn.title = this.value;
        const match = ntc.name(this.value);
        colorNameSpan.textContent = match[1] || this.value;
    });

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'color-swatch-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Remove color';
    removeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const colorRows = wrapper.closest('.variant-row').querySelectorAll('.color-swatch-wrapper');
        if (colorRows.length > 1) {
            wrapper.remove();
        }
    });

    wrapper.appendChild(colorInput);
    wrapper.appendChild(swatchBtn);
    wrapper.appendChild(colorNameSpan);
    wrapper.appendChild(removeBtn);
    return wrapper;
}

// Initialize with one variant row
addVariantRow();

// Add variant button
addVariantBtn?.addEventListener('click', function () {
    addVariantRow();
});

// Initialize variants from product data (for edit page)
if (typeof window.productVariants !== 'undefined' && window.productVariants.length > 0) {
    // Clear the default variant row
    const defaultRow = document.querySelector('.variant-row');
    if (defaultRow) defaultRow.remove();

    // Add variant rows from product data
    window.productVariants.forEach(variant => {
        addVariantRow({
            size: variant.size,
            stock: variant.stock,
            colors: variant.colors || []
        });
    });
}

// ---- Color management (legacy - keeping for compatibility) ----
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

    // Hidden input for form submission
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'images[]';
    hidden.value = url;
    document.getElementById('productDetailForm').appendChild(hidden);

    // Preview element
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
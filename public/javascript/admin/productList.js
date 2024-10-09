const editModal = document.getElementById('editModal');

const imageInput = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const cropModal = document.getElementById('cropModal');
const cropImage = document.getElementById('cropImage');
const cropButton = document.getElementById('cropButton');
const cancelButton = document.getElementById('cancelButton');
let cropper;
let uploadedImages = 0;
let selectedImages = [];

//* for toggling active checkbox
async function toggleStatus(target) {
    const productId = target.dataset.productId;
    let isActive = target.checked;

    console.log(isActive)

    // target.checked ? isActive = true : isActive = false;

    const response = await fetch('/admin/status', {
        method: "PUT",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive, productId })
    });

    const data = await response.json();

    if (!data.success) {
        alert(data.message);
        return;
    }

    await Swal.fire({
        title: 'Success',
        text: `${isActive ? 'Product is available for purchase' : 'Product is deactivated from purchase'}`,
        icon: 'success',
        width: '600px',
        confirmButtonText: 'Ok'
    });
    // const span = document.getElementById(`productIsActive_${productId}`);
    // console.log(span)
    document.querySelector(`#productIsActive_${productId}`).innerText = `${isActive ? "Active" : "Inactive"}`;
}

//*---------------------------------------[Product Edit Modal]-------------------------------------------------

//function to add cropped image to the preview containerF
function addCroppedImagePreview(imageSrc) {
    const croppedImageContainer = document.createElement('div');
    croppedImageContainer.classList.add('relative', 'mr-4', 'mb-4', 'w-32', 'h-32');

    const croppedImage = document.createElement('img');
    croppedImage.src = imageSrc;
    croppedImageContainer.appendChild(croppedImage);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'X';
    removeButton.type = 'button';
    removeButton.classList.add('absolute', 'top-0', 'right-0', 'bg-red-500', 'hover:bg-red-700', 'text-white', 'font-bold', 'py-1', 'px-2', 'rounded-full', 'm-2', 'text-xs');
    croppedImageContainer.appendChild(removeButton);

    imagePreview.appendChild(croppedImageContainer);

    //Adds the image source to the array.
    selectedImages.push(imageSrc);

    removeButton.addEventListener('click', function () {
        imagePreview.removeChild(croppedImageContainer);
        uploadedImages--;
        imageInput.disabled = false;

        //Removes the image source from the array.
        const index = selectedImages.indexOf(imageSrc);
        if (index >= 0) {
            selectedImages.splice(index, 1); // Remove the image URL from the array
        }
        console.log(selectedImages)
    });

    uploadedImages++;
}


//function to submit the updated product details
async function showProductDetails(product) {
    const selectElement = document.getElementById('brands');

    const brands = product.categoryId.brands;
    let selectedBrand = '';

    document.getElementById('productId').value = product._id;
    document.getElementById('productName').value = product.productName;
    document.getElementById('price').value = product.productPrice;
    document.getElementById('fabric').value = product.fabric;
    document.getElementById('gender').value = product.gender;
    document.getElementById('selectedGender').value = product.gender;
    document.getElementById('discount').value = product.discount;
    document.getElementById('category').value = product.categoryId.title;
    document.getElementById('selectedCategory').value = product.categoryId._id;
    document.getElementById('selectedBrand').value = product.brand;
    document.getElementById('size').value = product.size;
    document.getElementById('selectedSize').value = product.size;
    document.getElementById('stock').value = product.stock;
    document.getElementById('description').value = product.description;

    if (brands && brands.length > 0) {
        brands.forEach(brand => {
            selectedBrand += `<option value="${brand}">${brand}</option>`;
        });
    }

    for (let i = 0; i < product.colors.length; i++) {
        document.getElementById(`color${i + 1}`).value = product.colors[i]
    }

    selectElement.innerHTML = selectedBrand + selectElement.innerHTML.slice(selectElement.selectedIndex);

    //* calls the function to display the image previews
    for (let i = 0; i < product.images.length; i++) {
        addCroppedImagePreview(product.images[i]);
    }

}

//* opens the editModal ...
function showEditModal(target) {
    const product = JSON.parse(target.dataset.product);

    editModal.classList.remove('hidden');
    window.scrollTo(0, 0);

    showProductDetails(product);
}

//listens to the category selection.
document.getElementById('category').addEventListener('change', async function () {
    const targetBrandContainer = document.getElementById('brands');

    const selectedOption = this.options[this.selectedIndex];

    const categoryId = selectedOption.dataset.categoryId;

    const selectedCategory = selectedOption.textContent.trim();

    targetBrandContainer.innerHTML = '';

    try {
        const response = await fetch(`/admin/fetchCategory/${categoryId}`, {
            method: "GET",
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!data.success) alert(data.message);

        //displays the default value 'Select'.
        const selectOption = document.createElement('option');
        selectOption.value = '';
        selectOption.innerText = 'Select';
        targetBrandContainer.appendChild(selectOption);

        //displays the brands in the selected category.
        data.category.brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.innerText = brand;
            targetBrandContainer.appendChild(option);
        });

        document.getElementById('selectedCategory').value = data.category._id;

    } catch (err) {
        console.error('Error caught while fetching categoryId', err);
    }
});

//for selecting the brand option.
document.getElementById('brands').addEventListener('change', function () {
    const selectedOption = this.value;
    const targetElement = document.getElementById('selectedBrand');
    targetElement.value = selectedOption;
});

//For selecting the size option
document.getElementById('size').addEventListener('change', function () {
    const selectedOption = this.value;
    const targetElement = document.getElementById('selectedSize');
    targetElement.value = selectedOption;
});

//For selecting the gender
document.getElementById('gender').addEventListener('change', function () {
    const selectedOption = this.value;
    const targetElement = document.getElementById('selectedGender');
    targetElement.value = selectedOption;
});

//*closes the editModal
function closeEditModal() {
    editModal.classList.add('hidden')
}

//*-------------------[File Functions]------------------------------------------
//function to initialize cropper
function openCropModal(imageUrl) {
    cropImage.src = imageUrl;
    cropModal.style.display = 'block';
    cropper = new Cropper(cropImage, {
        aspectRatio: 1,
        viewMode: 1
    });
}

//* listens to the file upload event.
imageInput.addEventListener('change', async function (event) {
    if (this.files.length === 1) {
        const file = this.files[0];

        const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            alert('Invalid file type. Please select an image file (jpg, jpeg, png, gif).');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            openCropModal(e.target.result);
        };
        reader.onerror = function () {
            alert('Error reading the image file');
            console.error('Error reading the image file');
        };
        reader.readAsDataURL(file);
    } else console.error('this.files.length !== 1')
});

//* listens to the crop event.
cropButton.addEventListener('click', async function () {
    const croppedCanvas = cropper.getCroppedCanvas();

    //Convert the cropped canvas to a Blob
    croppedCanvas.toBlob(async function (blob) {
        const formData = new FormData();
        formData.append('croppedImage', blob, 'cropped.jpg');

        const response = await fetch('/admin/uploadImage', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            console.log(data.message);
            alert(data.message);
            return;
        }

        addCroppedImagePreview(data.imageUrl);
    });
    cropModal.style.display = 'none';
    cropper.destroy();
});

//* listens to the cancel crop event.
cancelButton.addEventListener('click', function () {
    cropModal.style.display = 'none';
    cropper.destroy();
});
//**************************************************************************

// * listens to the submit event to update product.
document.getElementById('productDetailForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const productId = document.getElementById('productId').value;

    let colors = [];

    document.querySelectorAll('input[name="color"]').forEach(input => {
        const colorValue = input.value;
        if (!colors.includes(colorValue)) {
            colors.push(colorValue);
        }
    });

    if (!colors) {
        alert('Please select the colors');
        return;
    }

    if (selectedImages.length < 3 || uploadedImages === 0) {
        alert('Must choose atleast 3 images.');
        return;
    }

    const productDetails = {
        productName: document.getElementById('productName').value.trim(),
        productPrice: document.getElementById('price').value.trim(),
        categoryId: document.getElementById('selectedCategory').value,
        stock: document.getElementById('stock').value,
        discount: document.getElementById('discount').value,
        brand: document.getElementById('selectedBrand').value,
        images: selectedImages,
        colors: colors,
        description: document.getElementById('description').value.trim(),
        fabric: document.getElementById('fabric').value,
        size: document.getElementById('selectedSize').value,
        gender: document.getElementById('selectedGender').value,
    };

    try {
        const response = await fetch(`/admin/productList/update/${productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productDetails })
        });

        const data = await response.json();

        if (!data.success) {
            console.error(data.message);
            alert(data.message);
            return;
        }

        await Swal.fire({
            title: "Success",
            text: "Product updated successfully",
            icon: "success",
            confirmButtonText: "Ok"
        });

        window.location.href = '/admin/productList';

    } catch (err) {
        console.error('Error caught while updating productDetailForm details in the productList.js in public folder.', err);
        alert('Error caught while updating productDetailForm details in the productList.js in public folder.')
    }
});


/*************************************[Product Search]***************************************************************/
document.getElementById('searchInput').addEventListener('input', async function () {
    const resultsContainer = document.getElementById('resultsContainer');
    const productContainer = document.getElementById('productContainer');
    const searchInputs = this.value.trim();

    if (!searchInputs) {
        resultsContainer.innerHTML = '';
        window.location.reload()
        return;
    }

    //show the loading... message
    resultsContainer.innerHTML = '<span class="w-full p-2 shadow text-slate-600 border text-medium">loading...</span>';


    try {
        const response = await fetch(`/admin/searchProduct?search=${encodeURIComponent(searchInputs)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();

        resultsContainer.innerHTML = '';


        if (data.products.length === 0) {
            resultsContainer.innerHTML = '<span class="w-full font-regular p-2 shadow-lg text-slate-600 border text-medium">Product not found.</span>';
        }
        else {
            productContainer.innerHTML = '';

            data.products.forEach(product => {
                if (product) {
                    const div = document.createElement('div')
                    div.innerHTML = `
                        <div class="relative overflow-hidden rounded-lg bg-gray-50 shadow-md">
                                <div>
                                    <input type="hidden" value="${product}">
                                </div>
                                <div class="aspect-w-16 aspect-h-8 mx-auto h-[260px] w-5/6 overflow-hidden p-4">
                                    <img src="${product.images[0]}" alt="Product image"
                                        class="h-full w-full object-contain" />
                                </div>
                                <div class="bg-white p-4 min-h-[260px]">
                                    <h3 class="text-sm mb-2 h-[100px] text-wrap font-bold text-slate-800">
                                        ${product.productName}
                                    </h3>
                                    <div class="">
                                        <h4><strong>Price: </strong>
                                            <span class="text-md font-medium text-gray-800">
                                                ₹${product.productPrice}/-
                                            </span>
                                        </h4>
                                        <h4><strong>Stock: </strong>
                                            <span class="text-md font-medium text-gray-800">
                                                ${product.stock}
                                            </span>
                                        </h4>
                                    </div>
    
                                    <p><strong>Created At: </strong>
                                        <span class="text-md font-medium text-gray-800">
                                            ${product.createdAt.toLocaleString()}
                                        </span>
                                    </p>
    
                                    <div class="mt-4 flex items-center justify-between space-x-2">
                                        <div class="parentElement flex items-center space-x-4">
                                            <label class="relative cursor-pointer flex gap-4">
                                                <input type="checkbox" class="peer sr-only"
                                                    onchange="toggleStatus(this)"
                                                    data-product-id="${product._id}"
                                                    ${product.isActive ? 'checked' : ''} />
                                                <div
                                                    class="peer flex h-6 w-11 items-center rounded-full bg-gray-300 after:absolute after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:bg-[#007bff] peer-checked:after:translate-x-full peer-checked:after:border-white">
                                                </div>
                                                <span class="targetElement flex items-center justify-center rounded-full border-none bg-sky-600 py-1 px-2 text-sm font-medium text-white" id="productIsActive_${product._id}">
                                                    ${product.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </label>
                                        </div>
                                        <div>
                                            <button class="mr-2" type="button" onclick="showEditModal(this)"
                                                data-product="${JSON.stringify(product)}">
                                                <svg xmlns="http://www.w3.org/2000/svg"
                                                    class="w-5 fill-blue-500 hover:fill-blue-700"
                                                    viewBox="0 0 348.882 348.882">
                                                        <path
                                                            d="m333.988 11.758-.42-.383A43.363 43.363 0 0 0 304.258 0a43.579 43.579 0 0 0-32.104 14.153L116.803 184.231a14.993 14.993 0 0 0-3.154 5.37l-18.267 54.762c-2.112 6.331-1.052 13.333 2.835 18.729 3.918 5.438 10.23 8.685 16.886 8.685h.001c2.879 0 5.693-.592 8.362-1.76l52.89-23.138a14.985 14.985 0 0 0 5.063-3.626L336.771 73.176c16.166-17.697 14.919-45.247-2.783-61.418zM130.381 234.247l10.719-32.134.904-.99 20.316 18.556-.904.99-31.035 13.578zm184.24-181.304L182.553 197.53l-20.316-18.556L294.305 34.386c2.583-2.828 6.118-4.386 9.954-4.386 3.365 0 6.588 1.252 9.082 3.53l.419.383c5.484 5.009 5.87 13.546.861 19.03z"
                                                            data-original="#000000" />
                                                        <path
                                                            d="M303.85 138.388c-8.284 0-15 6.716-15 15v127.347c0 21.034-17.113 38.147-38.147 38.147H68.904c-21.035 0-38.147-17.113-38.147-38.147V100.413c0-21.034 17.113-38.147 38.147-38.147h131.587c8.284 0 15-6.716 15-15s-6.716-15-15-15H68.904C31.327 32.266.757 62.837.757 100.413v180.321c0 37.576 30.571 68.147 68.147 68.147h181.798c37.576 0 68.147-30.571 68.147-68.147V153.388c.001-8.284-6.715-15-14.999-15z"
                                                            data-original="#000000" />
                                                </svg>
                                            </button>
                                            <button class="" id="Delete" type="button">
                                                <svg xmlns="http://www.w3.org/2000/svg"
                                                    class="w-5 fill-red-500 hover:fill-red-700"
                                                    viewBox="0 0 24 24">
                                                        <path
                                                            d="M19 7a1 1 0 0 0-1 1v11.191A1.92 1.92 0 0 1 15.99 21H8.01A1.92 1.92 0 0 1 6 19.191V8a1 1 0 0 0-2 0v11.191A3.918 3.918 0 0 0 8.01 23h7.98A3.918 3.918 0 0 0 20 19.191V8a1 1 0 0 0-1-1Zm1-3h-4V2a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2H4a1 1 0 0 0 0 2h16a1 1 0 0 0 0-2ZM10 4V3h4v1Z"
                                                            data-original="#000000" />
                                                        <path
                                                            d="M11 17v-7a1 1 0 0 0-2 0v7a1 1 0 0 0 2 0Zm4 0v-7a1 1 0 0 0-2 0v7a1 1 0 0 0 2 0Z"
                                                            data-original="#000000" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
    
                        `;
                    productContainer.appendChild(div);
                } else {
                    productContainer.innerHTML = '<div class="border-b text-sm border-gray-200 px-6 py-4">No Products were found.</div>';
                }
            });
        }
    } catch (err) {
        console.error(`Error caught search functionality in client side.${err}`);
        resultsContainer.innerHTML = '<span class="w-full p-2 shadow text-slate-600 border text-medium">Something went wrong.</span>'
        alert(err.message);
    }
});

//*------------------------------------------[Remove Product]--------------------------------------------------
async function removeProduct(target) {
    const productId = JSON.parse(target.dataset.productId);
    try {

        if (!productId || typeof productId !== 'string') {
            alert('Product ID is not found/incorrect datatype while removing a product.');
            return;
        }

        const { isConfirmed } = await Swal.fire({
            title: "Are you sure?",
            text: "Do you want to remove this product from the list?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, keep it',
        });

        if (isConfirmed) {

            const response = await fetch(`/admin/removeProduct?productId=${productId}`, {
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (!data.success) {
                alert(data.message);
            }

            await Swal.fire("Your product has been removed!", {
                icon: "success",
            });

            window.location.reload();
        } else {
            await Swal.fire("Your product is safe!");
        }

    } catch (err) {
        console.error(`Error caught removeProduct functionality in client side.${err}`);
        alert(err.message);
    }
}

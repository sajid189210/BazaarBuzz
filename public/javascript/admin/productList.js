const editModal = document.getElementById('editModal');
const imageInput = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const cropModal = document.getElementById('cropModal');
const cropImage = document.getElementById('cropImage');
const cropButton = document.getElementById('cropButton');
const cancelButton = document.getElementById('cancelButton');
let cropper;
let uploadedImages = 0;
// let selectedImages = []; //? moved to productVariantOption.js file in public

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
    });

    uploadedImages++;
}

function populateOptions(variants) {
    const optionContainer = document.getElementById('optionContainer');

    // displays the first option data.
    document.querySelector("select[name='sizes']").value = variants[0].size;
    document.querySelector("input[name='stock']").value = variants[0].stock;

    // passing colors to the input.
    for (let i = 0; i < variants[0].colors.length; i++) {
        document.getElementById(`color-0-${i + 1}`).value = variants[0].colors[i];
    }

    // loops through the variants array if more than one variant exist
    for (let i = 1; i < variants.length; i++) {
        optionCount++;

        const divContainer = document.createElement('div');
        divContainer.classList.add('grid', 'gap-x-4', 'sm:col-span-3');

        // Creates a remove button
        const removeButton = document.createElement('button');
        removeButton.textContent = 'X';
        removeButton.classList.add('remove-option', 'text-red-500', 'font-bold', 'ml-2');

        // Adds event listener for the remove button
        removeButton.addEventListener('click', function () {
            optionContainer.removeChild(divContainer);
            optionCount--; // Decrement the count

            // Show the add button again if less than 6
            if (optionContainer.children.length < 6) {
                document.getElementById('addOptions').style.display = 'block';
            }
        });

        // Create size label and select with unique ID
        const sizeDiv = document.createElement('div');

        const sizeLabel = document.createElement('label');
        sizeLabel.setAttribute('for', `size-${optionCount}`); // Unique ID
        sizeLabel.classList.add('mb-2', 'block', 'text-sm', 'font-medium', 'text-gray-900');
        sizeLabel.textContent = 'Size';

        const sizeSelect = document.createElement('select');
        sizeSelect.id = `size-${optionCount}`; // Unique ID
        sizeSelect.name = 'sizes'
        sizeSelect.classList.add('block', 'w-full', 'rounded-lg', 'border', 'border-gray-300', 'bg-gray-50', 'p-2.5', 'text-gray-900', 'shadow-sm', 'focus:border-cyan-600', 'focus:ring-cyan-600', 'sm:text-sm', 'sizes');
        sizeSelect.innerHTML = `
                    <option value="">select</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="XXXL">XXXL</option>
                `;
        sizeSelect.value = variants[i].size;  //-> displays the value in the form.

        const hiddenSizeInput = document.createElement('input');
        hiddenSizeInput.type = 'hidden';
        hiddenSizeInput.name = 'size';


        sizeDiv.appendChild(sizeLabel);
        sizeDiv.appendChild(sizeSelect);
        sizeDiv.appendChild(hiddenSizeInput);


        // Creates stock label and input
        const stockDiv = document.createElement('div');

        const stockLabel = document.createElement('label');
        stockLabel.setAttribute('for', `stock-${optionCount}`); // Unique ID
        stockLabel.classList.add('mb-2', 'block', 'text-sm', 'font-medium', 'text-gray-900');
        stockLabel.textContent = 'Stock';

        const stockInput = document.createElement('input');
        stockInput.type = 'number';
        stockInput.name = 'stock';
        stockInput.id = `stock-${optionCount}`; // Unique ID
        stockInput.classList.add('block', 'w-full', 'rounded-lg', 'border', 'border-gray-300', 'bg-gray-50', 'p-2.5', 'text-gray-900', 'shadow-sm', 'focus:border-cyan-600', 'focus:ring-cyan-600', 'sm:text-sm', 'stocks');

        stockInput.value = variants[i].stock; //-> displays the value in the form.

        stockDiv.appendChild(stockLabel);
        stockDiv.appendChild(stockInput);

        // Creates color inputs
        const colorDiv = document.createElement('div');
        colorDiv.classList.add('col-span-6');

        const colorLabel = document.createElement('label');
        colorLabel.setAttribute('for', `color-${optionCount}-1`);
        colorLabel.classList.add('mt-4', 'mb-2', 'block', 'text-sm', 'font-medium', 'text-gray-900');
        colorLabel.textContent = 'Colors';

        const colorInputs = [];
        for (let i = 1; i <= 3; i++) {
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.name = `color-${optionCount}-${i}`; // Unique name
            colorInput.id = `color-${optionCount}-${i}`; // Unique ID
            colorInput.classList.add('border', 'border-slate-300', 'mb-2');
            colorInputs.push(colorInput);
            colorDiv.appendChild(colorInput);
        }

        colorDiv.appendChild(colorLabel);
        colorInputs.forEach(input => colorDiv.appendChild(input));

        // Appends the remove button, size, stock, and color sections to the main container
        divContainer.appendChild(sizeDiv);
        divContainer.appendChild(stockDiv);
        divContainer.appendChild(removeButton);
        divContainer.appendChild(colorDiv);
        optionContainer.appendChild(divContainer);

        // passing colors to the input.
        for (let j = 0; j < variants[i].colors.length; j++) {
            document.querySelector(`#color-${i}-${j + 1}`).value = variants[i].colors[j];
        }
    };
    return;
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
    document.getElementById('productDetails').value = product.description;

    if (product.featured) document.querySelector('#featured').checked = true;
    if (product.limitedEdition) document.querySelector('#limitedEdition').checked = true;

    if (brands && brands.length > 0) {
        brands.forEach(brand => {
            selectedBrand += `<option value="${brand}">${brand}</option>`;
        });
    }

    populateOptions(product.variants); // show the size, stock and color 

    selectElement.innerHTML = selectedBrand + selectElement.innerHTML.slice(selectElement.selectedIndex);

    //* calls the function to display the image previews
    for (let i = 0; i < product.images.length; i++) {
        addCroppedImagePreview(product.images[i]);
    }

}

//* opens the editModal ...
function showEditModal(target) {
    const product = JSON.parse(target.dataset.product);
    console.log(product);


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

//* listens to the submit event to update product.
document.getElementById('productDetailFormSubmission').addEventListener('click', async function (event) {

    const productId = document.getElementById('productId').value;

    const result = await prepareProductDetails();

    if (!result.success) {
        return;
    }

    // Validates the empty input fields.
    for (let key in result.productDetails) {
        // Checks if the key is neither 'featured' nor 'limitedEdition'
        if (!['featured', 'limitedEdition'].includes(key)) {
            if (!result.productDetails[key]) {
                await Swal.fire({
                    title: 'All fields required!',
                    text: 'Please fill all the fields.',
                    icon: 'warning',
                    confirmButtonText: 'Ok'
                });
                return;
            }
        }
    }


    // validates the product price.  
    if (result.productDetails.productPrice < 0) {
        await Swal.fire({
            title: 'Invalid Price!',
            text: 'Price should be a valid positive integer.',
            icon: 'warning',
            confirmButtonText: 'Ok'
        });
        return;
    }

    // validates the product discount.  
    if (result.productDetails.discount < 0) {
        await Swal.fire({
            title: 'Invalid Discount!',
            text: 'Discount should be a valid positive integer.',
            icon: 'warning',
            confirmButtonText: 'Ok'
        });
        return;
    }

    // validates the product images.
    if (selectedImages.length < 3 || uploadedImages === 0) {
        await Swal.fire({
            title: 'Not enough images!',
            text: 'Please choose minimum of 3 images.',
            icon: 'warning',
            confirmButtonText: 'Ok'
        });
        return;
    }

    try {
        const response = await fetch(`/admin/productList/update?productId=${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productDetails: result.productDetails })
        });

        const data = await response.json();

        if (!data.success) {
            await Swal.fire({
                title: 'Error',
                text: data.message,
                icon: 'error',
                confirmButtonText: 'Ok'
            });
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

                    function escapeQuotes(str) {
                        return str.replace(/"/g, '&quot;');
                    }
                    console.log(product);
                    
                    
                    const productString = escapeQuotes(JSON.stringify(product));

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
                                    <h3 class="text-sm mb-4 text-wrap font-bold text-slate-800">
                                        ${product.productName}
                                    </h3>
                                    <div class="h-[150px]">
                                            <h4 class="mb-2 font-medium">Price:
                                                <span class="text-md font-medium text-gray-800">₹${product.productPrice}/-</span>
                                            </h4>
                                            <div>
                                                ${product.variants.map(variant => `
                                                    <div class="flex gap-4 mb-2">
                                                        <h4 class="font-medium">Size:
                                                            <span class="text-md font-medium text-gray-800">${variant.size}</span>
                                                        </h4>
                                                        <h4 class="font-medium">Stock:
                                                            <span class="text-md font-medium text-gray-800">${variant.stock}</span>
                                                        </h4>
                                                    </div>
                                                `).join('')}
                                            </div>
                                            <p class="font-medium">Created At:
                                                <span class="text-md font-medium text-gray-800">${new Date(product.createdAt).toLocaleDateString()}</span>
                                            </p>
                                    </div>
    
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
                                                data-product="${productString}">
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

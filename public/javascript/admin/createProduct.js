document.addEventListener('DOMContentLoaded', function () {

    const imageInput = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const cropModal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');
    const cropButton = document.getElementById('cropButton');
    const cancelButton = document.getElementById('cancelButton');
    let uploadedImages = 0;
    // let selectedImages = []; //? moved to productVariantOption.js file in public
    let cropper;


    //* For selecting the category & listing the brands of the selected category
    document.getElementById('category').addEventListener('change', async function () {
        const targetBrandContainer = document.getElementById('brands');

        const selectedOption = this.options[this.selectedIndex];

        const categoryId = selectedOption.dataset.categoryId;

        // const selectedCategory = selectedOption.textContent.trim();

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

    // For selecting the gender
    document.getElementById('gender').addEventListener('change', function () {
        const selectedOption = this.value;
        const targetElement = document.getElementById('selectedGender');
        targetElement.value = selectedOption;
    });


    //* ***************************************************************[FILE FUNCTIONS]******************************************************** *//
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

    //function to add cropped image to the preview container
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

    //* listens to the crop event.
    cropButton.addEventListener('click', async function () {
        const croppedCanvas = cropper.getCroppedCanvas();

        // Convert the cropped canvas to a Blob
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
            }

            addCroppedImagePreview(data.imageUrl);
        });
        cropModal.style.display = 'none';
        cropper.destroy();
    });

    // //listens to the cancel crop event.
    // cancelButton.addEventListener('click', function () {
    //     cropModal.style.display = 'none';
    //     cropper.destroy();
    // });
    //**************************[FILE FUNCTIONS ENDS HERE (^_^) ]************************************************/


    //* listens to the submit event to create product.
    document.getElementById('productDetailForm').addEventListener('submit', async function (event) {
        event.preventDefault();

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
            const response = await fetch('/admin/productList/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productDetails: result.productDetails }),
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
                title: 'Success',
                text: data.message,
                icon: 'success',
                confirmButtonText: 'Ok'
            });

            window.location.href = '/admin/productList';

        } catch (err) {
            alert("Error");
            console.error('Error caught while submitting productDetailForm details in the createProduct.js in public folder.');
        }
    });

});
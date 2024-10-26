//* **********************************************[THIS IS FOR VARIANT OPTION]******************************************************** *//
let optionCount = 0;
let selectedImages = []; //? (^_^)  moved from createProduct.js file in public

document.getElementById('addOptions').addEventListener('click', function () {
    optionCount++;

    const optionContainer = document.getElementById('optionContainer');
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

    stockDiv.appendChild(stockLabel);
    stockDiv.appendChild(stockInput);

    // Creates color inputs
    const colorDiv = document.createElement('div');
    colorDiv.classList.add('col-span-6');

    const colorLabel = document.createElement('label');
    colorLabel.setAttribute('for', `color-${optionCount}-1`);
    colorLabel.classList.add('mt-4', 'block', 'text-sm', 'font-medium', 'text-gray-900');
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

    // Checks the number of options and hide the button if necessary.
    if (optionContainer.children.length > 6) {
        document.getElementById('addOptions').style.display = 'none';
    }
});


// function to get colors for an option.
function getColors(optionIndex) {
    return Array.from(document.querySelectorAll(`input[name^="color-${optionIndex}"]`))
        .map(input => input.value);
}

// function to prepare product details for from submission.
async function prepareProductDetails() {
    const featured = document.querySelector('#featured').checked ? true : false;
    const limitedEdition = document.querySelector('#limitedEdition').checked ? true : false;
    let sizeArray = [];


    const productDetails = {
        productName: document.getElementById('productName').value.trim(),
        productPrice: document.getElementById('price').value.trim(),
        categoryId: document.getElementById('selectedCategory').value,
        discount: document.getElementById('discount').value,
        brand: document.getElementById('selectedBrand').value,
        description: document.getElementById('productDetails').value.trim(),
        fabric: document.getElementById('fabric').value,
        gender: document.getElementById('selectedGender').value,
        images: selectedImages,
        featured,
        limitedEdition,
        variants: [],
    };

    for (let i = 0; i <= optionCount; i++) {
        const size = document.querySelector(`#size-${i}`).value;
        const stock = document.querySelector(`#stock-${i}`).value;
        const colors = [...new Set(getColors(i))]; // removes the duplicate colors.

        if (size && stock) {
            // checks if the size already selected.
            if (sizeArray.includes(size)) {
                await Swal.fire({
                    title: 'Invalid Option',
                    text: `You have already selected Size: ${size}. Please change it.`,
                    icon: 'warning',
                    confirmButtonText: 'Ok'
                });
                return { success: false };
            }

            // stock validation
            if (stock <= 0) {
                await Swal.fire({
                    title: 'Invalid Option',
                    text: `Stock must be a positive integer.`,
                    icon: 'warning',
                    confirmButtonText: 'Ok'
                });
                return { success: false };
            }

            sizeArray.push(size);

            productDetails.variants.push({
                size: size,
                stock: parseInt(stock),
                colors: colors
            });

        } else {
            await Swal.fire({
                title: 'Invalid Option',
                text: 'Please fill both size and stock fields. Stock must be a valid positive integer. Zero does not include.',
                icon: 'warning',
                confirmButtonText: 'Ok'
            });
            return { success: false };
        }
    }
    return { productDetails, success: true };
}
//* *************************************[VARIANT OPTION ENDS HERE (^_^) ]******************************************************************** */

//* Function for setting colors for selected size.

function sizeSelect() {
    const colorContainer = document.querySelector('#colorContainer');
    const selectedSize = document.querySelector('input[name="size"]:checked');
    const stockValue = document.querySelector('#stockValue');

    colorContainer.innerHTML = '';

    const product = JSON.parse(selectedSize.dataset.product);

    if (!selectedSize) {
        alert('Error caught when selecting sizes')
        return;
    }

    // updates the hidden input for selected size.
    document.getElementById('selectedSize').value = selectedSize.value;

    // Finding the selected variant object by size.
    const index = product.variants.findIndex(obj => obj.size === selectedSize.value);

    const colors = product.variants[index].colors;

    const stock = product.variants[index].stock;

    // Updates hidden input for selected stock
    document.querySelector('#selectedStock').value = stock;

    // Checking conditions for displaying stock range.
    if (!stock || stock < 0) {
        stockValue.textContent = 'Out of Stock';
        stockValue.classList.add('text-xl', 'text-red-500');
    } else if (stock < 10) {
        if (stock === 1) {
            stockValue.textContent = `Only ${stock} product is left`;
            stockValue.classList.add('text-xl', 'text-red-500');
        } else {
            stockValue.textContent = `Only ${stock} products are left`;
            stockValue.classList.add('text-xl', 'text-red-500');
        }
    } else {
        stockValue.textContent = 'In Stock';
        stockValue.classList.add('text-xl', 'text-green-500');
    }

    // Displaying colors that matched with selectedSize.
    colors.forEach(color => {
        const colorLabel = document.createElement('label');
        colorLabel.classList.add('flex', 'items-center', 'cursor-pointer');

        const colorInput = document.createElement('input');
        colorInput.type = 'radio';
        colorInput.name = 'color';
        colorInput.classList.add('peer', 'hidden');
        colorInput.value = color;

        const colorSpan = document.createElement('span');
        colorSpan.classList.add(
            'h-10', 'w-10', 'ml-3', 'flex', 'items-center',
            'justify-center', 'border-2', 'rounded-full',
            'transition-all', 'duration-300',
            'peer-checked:border-4',           // Highlight the border when checked
            'peer-checked:border-red-500',    // Change border color to red
            'peer-checked:scale-110'          // Slightly enlarge the selected button
        );
        colorSpan.style.backgroundColor = color;

        // colorInput.addEventListener('change', function (event) {
        //     colorSpan.className = 'h-10 w-10 ml-3 flex items-center justify-center rounded-full';
        //     colorSpan.style.border = '4px';
        // });

        colorLabel.appendChild(colorInput);
        colorLabel.appendChild(colorSpan);

        colorContainer.appendChild(colorLabel);
    });

    // Updates hidden input for selected color
    const colorInputs = document.querySelectorAll('input[name="color"]');
    colorInputs.forEach(input => {
        input.addEventListener('change', () => {
            document.getElementById('selectedColor').value = input.value;
        });
    });
}

// Call sizeSelect to populate colors for the initially selected size.
sizeSelect();



// Function to change the main image and update zoom background
function changeImage(thumbnail) {
    const newSrc = thumbnail.src;
    const mainImage = document.getElementById('mainImageContainer');
    mainImage.src = newSrc;

    const zoomedImage = document.querySelector('.zoomed-image');
    zoomedImage.style.backgroundImage = `url('${newSrc}')`;

    // Reinitialize ElevateZoom for the new main image
    initializeZoom();
}

// Initialize ElevateZoom
function initializeZoom() {
    const mainImage = $('#mainImageContainer');

    // Destroy any previous zoom instance
    if (mainImage.data('elevateZoom')) {
        mainImage.elevateZoom("destroy");
    }

    //config.
    mainImage.elevateZoom({
        zoomType: "window",
        lensShape: "square",
        lensSize: 50,
        backgroundSize: "1600px 1600px",
        scrollZoom: true,
        cursor: 'crosshair',
        easing: 'swing',
        // zoomWindowWidth: 800,
        // zoomWindowHeight: 800
    });

    // Set up custom mousemove events
    setupMouseMoveZoom(mainImage);
}

// Function to handle mouse movement for zoom
function setupMouseMoveZoom(mainImage) {
    const container = document.querySelector('.image-zoom-container');
    const zoomedImage = container.querySelector('.zoomed-image');

    container.addEventListener('mousemove', (e) => {
        const { offsetX, offsetY } = e;
        const { width, height } = container.getBoundingClientRect();

        // Calculates the percentage position of the mouse
        const xPercent = (offsetX / width) * 100;
        const yPercent = (offsetY / height) * 100;

        // Moves the zoomed image
        zoomedImage.style.backgroundPosition = `${xPercent}% ${yPercent}%`;

        // Position the zoomed image based on mouse cursor
        zoomedImage.style.left = `${e.pageX - 200}px`;
        zoomedImage.style.top = `${e.pageY - 300}px`;
    });

    container.addEventListener('mouseleave', () => {
        zoomedImage.style.display = 'none';
    });

    container.addEventListener('mouseenter', () => {
        zoomedImage.style.display = 'block';
    });
}

// Call initializeZoom when the document is ready
$(document).ready(function () {
    initializeZoom();
});





//*-------------------[Cart]------------------------------------------
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

async function addToCart(productId) {
    try {
        const selectedColor = document.getElementById('selectedColor').value;
        const selectedSize = document.getElementById('selectedSize').value;
        const selectedStock = document.getElementById('selectedStock').value;

        console.log(selectedColor, selectedSize, selectedStock)

        if (selectedStock < 1) {
            return Toast.fire({ icon: 'info', title: 'Sorry, Currently the product is out of the stock' });
        }

        if (!selectedColor) {
            return Toast.fire({ icon: 'warning', title: 'Please select a color to proceed.' });
        }

        const response = await fetch('/user/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, color: selectedColor, size: selectedSize, stock: selectedStock })
        });

        const data = await response.json();

        //checks if the session is active.
        if (!data.session) {
            await Swal.fire({
                title: 'You are not Signed In!',
                text: data.message,
                icon: 'info',
                confirmButtonText: 'Sign In'
            });

            window.location.href = data.redirectUrl;
            return;
        }

        //catches the error messages.
        if (!data.success) {
            await Swal.fire({
                title: 'error',
                text: data.message,
                icon: 'error',
                confirmButtonText: 'Ok'
            });
            return;
        }

        // //catches if the cart is full.
        // if (data.success === 'full') {
        //     const { isConfirmed } = await Swal.fire({
        //         title: 'Warning',
        //         text: data.message,
        //         icon: 'warning',
        //         showCancelButton: true,
        //         confirmButtonText: 'Got to cart',
        //         cancelButtonText: 'Continue shopping',
        //     });
        //     if (isConfirmed) {
        //         window.location.href = data.redirectUrl;
        //     }
        //     return;
        // }


        await Swal.fire({
            title: 'Success',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'View cart'
        });

        window.location.href = data.redirectUrl;

    } catch (err) {
        console.log('Error caught when passing the product Id to the cart.', err);
        alert('Error caught when passing the the product Id to the cart.', err);
    }
}


// function to add product to the wishlist.
async function addToWishList(productId) {
    try {
        if (!productId) {
            alert('productId not found when adding to wishList');
        }

        const response = await fetch('/user/wishlist', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        });

        const data = await response.json();

        if (!data.session) {
            await Swal.fire({
                title: 'SignIn!',
                text: data.message,
                icon: 'info',
                confirmButtonText: 'Ok'
            });
            window.location.href = data.redirectUrl;
            return;
        }

        if (!data.success) {
            await Swal.fire({
                title: 'failed',
                text: data.message,
                icon: 'warning',
                confirmButtonText: 'Ok'
            });
            if (data.redirectUrl) window.location.href = data.redirectUrl;
            return;
        }


        Toast.fire({
            icon: 'success',
            title: data.message
        });

    } catch (err) {
        console.log(err);
        alert('Error');
    }
}
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
async function addToCart(productId, stock) {
    try {
        // Exist the function if there is no stock.
        if (parseInt(stock) === 0) {
            await Swal.fire({
                title: 'Out of Stock',
                text: 'Sorry, This product is currently unavailable',
                icon: 'info',
                confirmButtonText: 'Ok'
            });
            return;
        }

        const selectedColor = document.getElementById('selectedColor').value || '';

        const response = await fetch('/user/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, color: selectedColor })
        });

        const data = await response.json();

        //checks if the session is active.
        if (!data.session) {
            await Swal.fire({
                title: '',
                text: data.message,
                icon: 'info',
                confirmButtonText: 'Sign In'
            });
            // alert(data.message);
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

        //catches if the cart is full.
        if (data.success === 'full') {
            const { isConfirmed } = await Swal.fire({
                title: 'Warning',
                text: data.message,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Got to cart',
                cancelButtonText: 'Continue shopping',
            });
            if (isConfirmed) {
                window.location.href = data.redirectUrl;
            }
            return;
        }


        await Swal.fire({
            title: 'Success',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'View cart'
        });

        window.location.href = data.redirectUrl;

    } catch (err) {
        console.log('Error caught when passing the the product Id to the cart.', err);
        alert('Error caught when passing the the product Id to the cart.', err);
    }
}

//* color the color.
function colorSelection(color) {
    document.getElementById('selectedColor').value = color;
}
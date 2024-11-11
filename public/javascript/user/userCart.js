//* Function to delete a cart item, called by onclick. 
async function removeItem(itemId) {
    try {

        const { isConfirmed } = await Swal.fire({
            title: "Are you sure?",
            text: "Do you want to remove this product from the cart?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: 'Yes, remove it!',
            cancelButtonText: 'No, keep it',
        });

        if (isConfirmed) {
            const response = await fetch(`/user/cart/removeItem`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId })
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
                tile: "Success",
                text: data.message,
                icon: 'success',
                confirmButtonText: 'Ok'
            });

            window.location.reload();
        }

    } catch (err) {
        console.log(`Error caught while removing an item from the cart. ${err}`);
        alert('Error: ', err);
    }
}

//* Function to decrease quantity.
async function decreaseQuantity(itemId, element) {
    try {
        const discountPriceElement = document.querySelector(`#discountPrice_${itemId}`);

        let quantity = parseInt(document.getElementById(`quantity_${itemId}`).textContent);

        if (quantity <= 1) {
            element.classList.add('hidden');
            return;
        }

        const response = await fetch('/user/cart/updateQuantity', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, process: false, })
        });

        const data = await response.json();

        if (!data.success) {
            await Swal.fire({
                title: "Error",
                text: data.message,
                icon: 'error',
                confirmButtonText: 'Ok'
            });
            return;
        }
        window.location.reload();

        document.getElementById(`originalPrice_${itemId}`).textContent = `₹ ${data.totalOriginalPrice.toFixed(2)}`;
        document.getElementById(`discountPrice_${itemId}`).textContent = `₹ ${data.totalDiscountedPrice.toFixed(2)}`;
        document.getElementById(`quantity_${itemId}`).textContent = data.quantity;

        // hides if the quantity is 5.
        if (quantity - 1 === 1) {
            element.classList.add('hidden');
        }

        document.querySelector(`#increaseButton_${itemId}`).classList.remove('hidden');
    } catch (err) {
        console.log(`Error caught while decreasing quantity from the cart. ${err}`);
        alert('Error: ', err);
    }
}

//* Function to increase quantity.
async function increaseQuantity(itemId, element) {
    try {
        const discountPriceElement = document.querySelector(`#discountPrice_${itemId}`);

        let quantity = parseInt(document.querySelector(`#quantity_${itemId}`).textContent);

        // Don't proceed further if quantity is 5
        if (quantity >= 5) {
            element.classList.add('hidden');
            return;
        }

        const response = await fetch('/user/cart/updateQuantity', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId, process: true })
        });

        const data = await response.json();

        if (!data.success) {
            await Swal.fire({
                text: data.message,
                icon: 'info',
                confirmButtonText: 'Ok'
            });
            return;
        }

        window.location.reload();

        document.getElementById(`originalPrice_${itemId}`).textContent = `₹ ${data.totalOriginalPrice.toFixed(2)}`;
        document.getElementById(`discountPrice_${itemId}`).textContent = `₹ ${data.totalDiscountedPrice.toFixed(2)}`;
        document.getElementById(`quantity_${itemId}`).textContent = data.quantity;

        // hides if the quantity is 5.
        if (data.quantity === 5) {
            element.classList.add('hidden');
        }

        document.querySelector(`#decreaseButton_${itemId}`).classList.remove('hidden'); // Show the decrease button

    } catch (err) {
        console.log(`Error caught while increasing quantity from the cart. ${err}`);
        alert('Error: ', err);
    }
}

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
                body: JSON.stringify({ itemId: JSON.parse(itemId) })
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
async function decreaseQuantity(itemId) {
    try {
        let quantity = parseInt(document.getElementById(`quantity_${JSON.parse(itemId)}`).textContent);
        let process = false;

        if (quantity === 1) return;

        const response = await fetch('/user/cart/updateQuantity', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity, itemId: JSON.parse(itemId), process })
        });

        const data = await response.json();

        if (!data.success) {
            await Swal.fire({
                tile: "Error",
                text: data.message,
                icon: 'error',
                confirmButtonText: 'Ok'
            });
            return;
        }

        window.location.reload();

    } catch (err) {
        console.log(`Error caught while decreasing quantity from the cart. ${err}`);
        alert('Error: ', err);
    }
}

//* Function to increase quantity.
async function increaseQuantity(itemId) {
    try {
        let quantity = parseInt(document.getElementById(`quantity_${JSON.parse(itemId)}`).textContent);
        console.log(quantity)
        let process = true;

        if (quantity >= 5) return;

        const response = await fetch('/user/cart/updateQuantity', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity, itemId: JSON.parse(itemId), process })
        });

        const data = await response.json();

        if (!data.success) {
            await Swal.fire({
                tile: "Error",
                text: data.message,
                icon: 'error',
                confirmButtonText: 'Ok'
            });
            return;
        }

        window.location.reload();

    } catch (err) {
        console.log(`Error caught while increasing quantity from the cart. ${err}`);
        alert('Error: ', err);
    }
}


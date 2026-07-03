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

const RATE_LIMIT = 1000;
let lastClickTime = 0;

async function updateQuantity(itemId, increase, button) {
    const currentTime = Date.now();

    if (currentTime - lastClickTime < RATE_LIMIT) {
        return;
    }

    lastClickTime = currentTime;
    button.disabled = true;

    try {
        const quantityElement = document.querySelector(`#quantity_${itemId}`);

        if (!quantityElement) {
            console.error("Quantity element not found");
            return;
        }

        const quantity = Number(quantityElement.textContent);

        if (!increase && quantity <= 1) {
            return;
        }

        if (increase && quantity >= 5) {
            return;
        }

        const response = await fetch("/user/cart/updateQuantity", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                itemId,
                process: increase
            })
        });

        const data = await response.json();

        if (!data.success) {
            await Swal.fire({
                icon: "info",
                text: data.message
            });
            return;
        }

        window.location.reload();

    } catch (err) {
        console.error(err);

        Swal.fire({
            icon: "error",
            text: "Something went wrong."
        });

    } finally {
        button.disabled = false;
    }
}
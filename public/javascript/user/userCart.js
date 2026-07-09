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
                await Swal.fire({ title: 'Error', text: data.message, icon: 'error', confirmButtonText: 'Ok' });
                return;
            }
            await Swal.fire({ tile: "Success", text: data.message, icon: 'success', confirmButtonText: 'Ok' });
            window.location.reload();
        }
    } catch (err) {
        console.log(`Error caught while removing an item from the cart. ${err}`);
        alert('Error: ', err);
    }
}

const RATE_LIMIT = 1000;
let lastClickTime = 0;

async function updateQuantity(itemId, increase) {
    const currentTime = Date.now();
    if (currentTime - lastClickTime < RATE_LIMIT) return;
    lastClickTime = currentTime;

    try {
        const cartItem = document.querySelector(`[data-item-id="${itemId}"]`);
        const quantityDisplay = cartItem?.querySelector('.quantity-display');
        if (!quantityDisplay) return;

        const quantity = Number(quantityDisplay.textContent);
        if (increase < 0 && quantity <= 1) return;
        if (increase > 0 && quantity >= 5) return;

        const response = await fetch("/user/cart/updateQuantity", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId, process: increase > 0 })
        });

        const data = await response.json();
        if (!data.success) {
            await Swal.fire({ icon: "info", text: data.message });
            return;
        }
        window.location.reload();
    } catch (err) {
        console.error(err);
        Swal.fire({ icon: "error", text: "Something went wrong." });
    }
}

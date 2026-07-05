const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    didOpen: (toast) => { toast.onmouseenter = Swal.stopTimer; toast.onmouseleave = Swal.resumeTimer; }
});

document.getElementById('cart-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(this);
    const productId = formData.get('productId');
    const size = formData.get('size');
    const color = formData.get('color');
    const quantity = formData.get('quantity') || 1;

    try {
        const response = await fetch('/user/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, size, color, quantity: parseInt(quantity) })
        });

        const data = await response.json();

        if (!data.session) {
            await Swal.fire({ title: 'You are not Signed In!', text: data.message, icon: 'info', confirmButtonText: 'Sign In' });
            window.location.href = data.redirectUrl;
            return;
        }

        if (!data.success) {
            await Swal.fire({ title: 'Error', text: data.message, icon: 'error', confirmButtonText: 'Ok' });
            return;
        }

        await Swal.fire({ title: 'Added to Cart!', text: data.message, icon: 'success', confirmButtonText: 'View Cart' });
        window.location.href = data.redirectUrl || '/user/cart';

    } catch (err) {
        console.log('Error adding to cart.', err);
        Toast.fire({ icon: 'error', title: 'Something went wrong' });
    }
});

document.querySelector('#search_btn').addEventListener('click', async function () {

    try {

        const searchInput = document.querySelector('#homeSearch').value.trim();

        if (!searchInput) return;

        const productData = await fetch(`/user/search/list?search=${encodeURIComponent(searchInput)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await productData.json();

        if (data.products.length === 0) {
            return;
        }

        console.log(data)

        window.location.href = '/user/getProductList/search';

    } catch (err) {
        alert('Err');
        console.log(err)
    }
}); 
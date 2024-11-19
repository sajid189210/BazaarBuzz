const homeSearch = document.getElementById('homeSearch');


homeSearch.addEventListener('input', async function (event) {
    const searchInputs = event.target.value.trim();
    const resultsContainer = document.getElementById('resultsContainer');

    resultsContainer.classList.remove('hidden');

    if (!searchInputs) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        return;
    }

    //show the loading... message
    resultsContainer.innerHTML = '<span class="w-full p-2 text-left">loading...</span>'

    try {

        const response = await fetch(`/user/search?search=${encodeURIComponent(searchInputs)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        resultsContainer.innerHTML = '';

        if (data.products.length === 0) {
            resultsContainer.innerHTML = '<span class="w-full p-2 text-left">Product not found.</span>';
        } else {
            data.products.forEach(product => {
                if (product) {
                    const link = document.createElement('a');
                    link.classList.add('truncate', 'p-2', 'text-gray-80', 'hover:bg-gray-50', 'rounded-lg');
                    link.innerText = product.productName;
                    link.href = `/user/viewProduct/?productId=${product._id}`;

                    resultsContainer.appendChild(link)
                } else {
                    resultsContainer.innerHTML = '<span class="w-full p-2 text-left">No products were found.</span>';
                }
            });
        }

    } catch (err) {
        console.error(`Error caught search functionality in client side.${err}`);
        resultsContainer.innerHTML = '<span class="w-full p-2 text-slate-600 text-medium">Something went wrong.</span>'
        alert(err.message);
    }


});
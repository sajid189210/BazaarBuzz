const homeSearch = document.getElementById('homeSearch');
const homeSearchMobile = document.getElementById('homeSearchMobile');

function setupSearch(input) {
    if (!input) return;
    input.addEventListener('input', async function (event) {
        const searchInputs = event.target.value.trim();
        const resultsContainer = document.getElementById('resultsContainer');
        if (!resultsContainer) return;
        resultsContainer.classList.remove('hidden');
        if (!searchInputs) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('hidden');
            return;
        }
        resultsContainer.innerHTML = '<span class="w-full p-2 text-left">loading...</span>';
        try {
            const response = await fetch(`/user/search?search=${encodeURIComponent(searchInputs)}`, { method: 'GET', headers: { 'Accept': 'application/json' } });
            const data = await response.json();
            resultsContainer.innerHTML = '';
            if (data.products.length === 0) {
                resultsContainer.innerHTML = '<span class="w-full p-2 text-left text-gray-400">Product not found.</span>';
            } else {
                data.products.forEach(product => {
                    if (product) {
                        const link = document.createElement('a');
                        link.classList.add('block', 'truncate', 'p-2', 'text-sm', 'text-gray-700', 'hover:bg-gray-50', 'rounded-lg');
                        link.textContent = product.productName;
                        link.href = `/user/viewProduct/?productId=${product._id}`;
                        resultsContainer.appendChild(link);
                    }
                });
            }
        } catch (err) {
            console.error('Error caught search functionality in client side.', err);
            const resultsContainer = document.getElementById('resultsContainer');
            if (resultsContainer) resultsContainer.innerHTML = '<span class="w-full p-2 text-slate-600 text-medium">Something went wrong.</span>';
        }
    });

    input.addEventListener('blur', function () {
        setTimeout(() => {
            const resultsContainer = document.getElementById('resultsContainer');
            if (resultsContainer) resultsContainer.classList.add('hidden');
        }, 200);
    });

    input.addEventListener('focus', function () {
        const resultsContainer = document.getElementById('resultsContainer');
        if (resultsContainer && this.value.trim()) resultsContainer.classList.remove('hidden');
    });
}

setupSearch(homeSearch);
setupSearch(homeSearchMobile);

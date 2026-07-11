// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Shared template functions
function renderProductCard(product) {
    const isActive = product.isActive;
    const totalStock = product.totalStock || 0;
    const isInStock = totalStock > 0;
    const image = product.images?.[0] || '/images/placeholder.jpg';
    const brand = product.brand || 'BazaarBuzz';
    const price = (product.productPrice || 0).toLocaleString();
    
    return `
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors product-card" 
             data-product-id="${product._id}" 
             data-category="${product.category || ''}" 
             data-status="${isActive}" 
             data-stock="${totalStock}">
            <div class="aspect-[4/5] bg-gray-50 relative overflow-hidden">
                <img src="${image}" alt="${product.productName}" class="w-full h-full object-cover" loading="lazy" />
                <div class="absolute top-2 right-2">
                    <span class="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">
                        ${isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="absolute top-2 left-2">
                    <span class="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${isInStock ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}">
                        ${isInStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                </div>
            </div>
            <div class="p-4">
                <p class="text-xs text-gray-400 uppercase tracking-widest">${brand}</p>
                <p class="text-sm font-medium text-gray-900 truncate mt-0.5">${product.productName}</p>
                <p class="text-sm font-semibold text-gray-900 mt-1">₹${price}</p>
                <p class="text-xs text-gray-400 mt-1">Category: ${product.category || '-'}</p>
                <div class="flex gap-2 mt-3">
                    <a href="/admin/editProduct/${product._id}" class="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50 transition-colors" title="Edit Product">
                        <i class="fa-solid fa-pen-to-square"></i>
                        <span class="hidden sm:inline">Edit</span>
                    </a>
                    <button onclick="toggleProduct('${product._id}')" class="flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${isActive ? 'border-red-300 text-red-500 hover:border-red-400 hover:bg-red-50' : 'border-green-300 text-green-600 hover:border-green-400 hover:bg-green-50'}" title="${isActive ? 'Deactivate' : 'Activate'}">
                        <i class="fa-solid ${isActive ? 'fa-ban' : 'fa-check-circle'}"></i>
                        <span class="hidden sm:inline">${isActive ? 'Block' : 'Unblock'}</span>
                    </button>
                    <button onclick="deleteProduct('${product._id}')" class="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-300 text-red-500 hover:border-red-400 hover:bg-red-50 px-3 py-1.5 text-xs font-semibold transition-colors" title="Delete Product">
                        <i class="fa-solid fa-trash"></i>
                        <span class="hidden sm:inline">Delete</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderEmptyState() {
    return `
        <div class="col-span-full text-center py-20">
            <i class="fa-solid fa-box-open text-4xl mb-3 text-gray-300"></i>
            <p class="text-lg font-medium text-gray-500">No products found</p>
            <p class="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
        </div>
    `;
}

function renderLoadingState() {
    return `
        <div class="col-span-full flex flex-col items-center justify-center py-16">
            <div class="animate-spin rounded-full h-10 w-10 border-3 border-rose-500 border-t-transparent"></div>
            <p class="mt-3 text-gray-500">Loading products...</p>
        </div>
    `;
}

function renderErrorState(message) {
    return `
        <div class="col-span-full text-center py-16">
            <i class="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-3"></i>
            <p class="text-lg font-medium text-gray-600">${message}</p>
            <button onclick="loadProducts()" class="mt-3 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors">
                <i class="fa-solid fa-rotate-left mr-1"></i>Retry
            </button>
        </div>
    `;
}

function renderPagination(currentPage, totalPages, totalCount, limit, params) {
    if (totalPages <= 1) return '';
    
    const baseParams = { ...params };
    delete baseParams.page;
    
    const buildPageUrl = (page) => {
        const p = { ...baseParams, page };
        return buildUrl(p);
    };
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (endPage - startPage < 4) {
        if (startPage === 1) endPage = Math.min(totalPages, startPage + 4);
        else if (endPage === totalPages) startPage = Math.max(1, endPage - 4);
    }
    
    let html = `
        <nav class="flex items-center justify-center gap-2" aria-label="Pagination">
            <a href="${buildPageUrl(currentPage - 1)}" class="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''} transition-colors" ${currentPage === 1 ? 'aria-disabled="true"' : ''}>
                <i class="fa-solid fa-chevron-left"></i>
                <span class="hidden sm:inline ml-1">Previous</span>
            </a>
            <div class="flex items-center gap-1">
    `;
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <a href="${buildPageUrl(i)}" class="w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium ${i === currentPage ? 'bg-rose-500 text-white' : 'text-gray-700 hover:bg-gray-100'} transition-colors" ${i === currentPage ? 'aria-current="page"' : ''}>
                ${i}
            </a>
        `;
    }
    
    html += `
            </div>
            <a href="${buildPageUrl(currentPage + 1)}" class="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''} transition-colors" ${currentPage === totalPages ? 'aria-disabled="true"' : ''}>
                <span class="hidden sm:inline mr-1">Next</span>
                <i class="fa-solid fa-chevron-right"></i>
            </a>
        </nav>
        <div class="mt-4 text-center text-sm text-gray-500">
            Showing ${((currentPage - 1) * limit) + 1} to ${Math.min(currentPage * limit, totalCount)} of ${totalCount} products
        </div>
    `;
    
    return html;
}

// URL & Filter Parameter Helpers
function getFilterParams() {
    const dataEl = document.getElementById('productListData');
    const params = new URLSearchParams(window.location.search);
    
    return {
        page: parseInt(params.get('page')) || parseInt(dataEl?.dataset.currentPage) || 1,
        search: params.get('search') || dataEl?.dataset.searchQuery || '',
        category: params.get('category') || dataEl?.dataset.categoryFilter || '',
        status: params.get('status') || dataEl?.dataset.statusFilter || '',
        stock: params.get('stock') || dataEl?.dataset.stockFilter || '',
        limit: parseInt(dataEl?.dataset.limit) || 8
    };
}

function buildUrl(params) {
    const urlParams = new URLSearchParams();
    if (params.page >= 1) urlParams.set('page', params.page);
    if (params.search) urlParams.set('search', params.search);
    if (params.category) urlParams.set('category', params.category);
    if (params.status) urlParams.set('status', params.status);
    if (params.stock) urlParams.set('stock', params.stock);
    return urlParams.toString() ? '?' + urlParams.toString() : '';
}

// UI Update Functions
function updateFilterInputs(params) {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const stockFilter = document.getElementById('stockFilter');
    
    if (searchInput) searchInput.value = params.search || '';
    if (categoryFilter) categoryFilter.value = params.category || '';
    if (statusFilter) statusFilter.value = params.status || '';
    if (stockFilter) stockFilter.value = params.stock || '';
}

function updateClearFiltersButton(params) {
    const clearBtn = document.getElementById('clearFilters');
    if (!clearBtn) return;
    const hasFilters = params.search || params.category || params.status || params.stock;
    clearBtn.classList.toggle('hidden', !hasFilters);
}

// Main Product Loading Logic
async function loadProducts(page = 1, paramsOverride = null) {
    const params = paramsOverride || getFilterParams();
    params.page = page;

    const serverPag = document.getElementById('serverPagination');
    if (serverPag) serverPag.style.display = 'none';
    const serverLabel = document.getElementById('serverPaginationLabel');
    if (serverLabel) serverLabel.style.display = 'none';
    
    const newUrl = buildUrl(params);
    window.history.pushState({}, '', newUrl);
    
    updateFilterInputs(params);
    
    const container = document.getElementById('productContainer');
    container.innerHTML = renderLoadingState();
    
    try {
        const response = await fetch(`/admin/products${newUrl}`);
        const data = await response.json();
        
        if (data.success) {
            if (data.products && data.products.length > 0) {
                container.innerHTML = data.products.map(renderProductCard).join('');
            } else {
                container.innerHTML = renderEmptyState();
            }
            
            const paginationContainer = document.getElementById('paginationContainer');
            if (paginationContainer) {
                paginationContainer.innerHTML = renderPagination(data.currentPage, data.totalPages, data.totalCount, data.limit, params);
            }
            
            updateClearFiltersButton(params);
        } else {
            container.innerHTML = renderErrorState(data.message || 'Failed to load products');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        container.innerHTML = renderErrorState('Failed to load products. Please try again.');
    }
}

function clearFilters() {
    const params = { page: 1, search: '', category: '', status: '', stock: '' };
    window.history.pushState({}, '', buildUrl(params));
    updateFilterInputs(params);
    loadProducts(1, params);
}

// Product Actions
async function toggleProduct(productId) {
    const { isConfirmed } = await Swal.fire({
        title: 'Toggle Status?',
        text: 'Change the product listing status?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
        confirmButtonColor: '#f43f5e',
        cancelButtonColor: '#6b7280'
    });
    
    if (!isConfirmed) return;
    
    const res = await fetch('/admin/status', { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ productId }) 
    });
    
    const data = await res.json();
    
    if (data.success) {
        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }).fire({ icon: 'success', title: data.message });
        setTimeout(() => loadProducts(getFilterParams().page), 1000);
    } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.message });
    }
}

async function deleteProduct(productId) {
    const { isConfirmed } = await Swal.fire({
        title: 'Delete Product?',
        text: 'This action cannot be undone. The product will be permanently removed.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
    });
    
    if (!isConfirmed) return;
    
    Swal.fire({ title: 'Deleting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const res = await fetch(`/admin/product/${productId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    
    if (data.success) {
        Swal.fire({ icon: 'success', title: 'Deleted!', text: data.message, timer: 2000, showConfirmButton: false });
        loadProducts(getFilterParams().page);
    } else {
        Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to delete product' });
    }
}

// Event Listeners
const debouncedSearch = debounce((value) => {
    const params = getFilterParams();
    params.search = value;
    params.page = 1;
    loadProducts(1, params);
}, 700);

function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                debouncedSearch.cancel?.();
                const params = getFilterParams();
                params.search = e.target.value;
                params.page = 1;
                loadProducts(1, params);
            }
        });
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            const params = getFilterParams();
            params.category = e.target.value;
            params.page = 1;
            loadProducts(1, params);
        });
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            const params = getFilterParams();
            params.status = e.target.value;
            params.page = 1;
            loadProducts(1, params);
        });
    }
    
    const stockFilter = document.getElementById('stockFilter');
    if (stockFilter) {
        stockFilter.addEventListener('change', (e) => {
            const params = getFilterParams();
            params.stock = e.target.value;
            params.page = 1;
            loadProducts(1, params);
        });
    }
    
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);
    
    window.addEventListener('popstate', () => {
        const params = getFilterParams();
        updateFilterInputs(params);
        loadProducts(params.page);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    const params = getFilterParams();
    updateClearFiltersButton(params);
    if (params.search || params.category || params.status || params.stock || params.page > 1) {
        updateFilterInputs(params);
        loadProducts(params.page);
    }
});

window.toggleProduct = toggleProduct;
window.deleteProduct = deleteProduct;
window.loadProducts = loadProducts;
window.clearFilters = clearFilters;
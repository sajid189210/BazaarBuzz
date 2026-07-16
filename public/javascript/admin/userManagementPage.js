// Debounce utility
let gTotalPages = 1;
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

// URL & Filter Parameter Helpers
function getFilterParams() {
    const dataEl = document.getElementById('userListData');
    const params = new URLSearchParams(window.location.search);

    return {
        page: parseInt(params.get('page')) || parseInt(dataEl?.dataset.currentPage) || 1,
        search: params.get('search') || dataEl?.dataset.search || '',
        status: params.get('status') || dataEl?.dataset.statusFilter || '',
        startDate: params.get('startDate') || dataEl?.dataset.startDate || '',
        endDate: params.get('endDate') || dataEl?.dataset.endDate || '',
        limit: parseInt(dataEl?.dataset.limit) || 10
    };
}

function buildUrl(params) {
    const urlParams = new URLSearchParams();
    if (params.page > 1) urlParams.set('page', params.page);
    if (params.search) urlParams.set('search', params.search);
    if (params.status) urlParams.set('status', params.status);
    if (params.startDate) urlParams.set('startDate', params.startDate);
    if (params.endDate) urlParams.set('endDate', params.endDate);
    return urlParams.toString() ? '?' + urlParams.toString() : '';
}

// UI Update Functions
function updateFilterInputs(params) {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    if (searchInput) searchInput.value = params.search || '';
    if (statusFilter) statusFilter.value = params.status || '';
    if (startDate) startDate.value = params.startDate || '';
    if (endDate) endDate.value = params.endDate || '';
}

function updateClearFiltersButton(params) {
    const clearBtn = document.getElementById('clearFilters');
    if (!clearBtn) return;
    const hasFilters = params.search || params.status || params.startDate || params.endDate;
    clearBtn.classList.toggle('hidden', !hasFilters);
}

// Render Functions
function renderUserRow(user, index, params) {
    const page = parseInt(params.page) || 1;
    const limit = parseInt(params.limit) || 10;
    const slNo = (page - 1) * limit + index + 1;
    const isBlocked = user.isBlocked === 'blocked';
    const date = new Date(user.createdAt).toLocaleDateString('en-IN');

    return `
        <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600">${slNo}</td>
            <td class="px-4 py-3 text-gray-900 font-medium">${user.username || '-'}</td>
            <td class="px-4 py-3 text-gray-600">${user.email}</td>
            <td class="px-4 py-3 text-gray-600">${date}</td>
            <td class="px-4 py-3">
                <span class="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${isBlocked ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}">
                    ${isBlocked ? 'Blocked' : 'Active'}
                </span>
            </td>
            <td class="px-4 py-3">
                <button onclick="toggleUser('${user._id}')" class="text-xs font-medium ${isBlocked ? 'text-green-600 hover:text-green-700' : 'text-red-500 hover:text-red-600'} transition-colors">
                    ${isBlocked ? 'Unblock' : 'Block'}
                </button>
            </td>
        </tr>
    `;
}

function renderEmptyState() {
    return `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No users found</td></tr>`;
}

function renderLoadingState() {
    return `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">
        <div class="flex items-center justify-center gap-2">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-rose-500 border-t-transparent"></div>
            <span>Loading users...</span>
        </div>
    </td></tr>`;
}

function renderPagination(currentPage, totalPages, totalCount, limit, params) {
    gTotalPages = totalPages;
    const baseParams = { ...params };
    delete baseParams.page;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (endPage - startPage < 4) {
        if (startPage === 1) endPage = Math.min(totalPages, startPage + 4);
        else if (endPage === totalPages) startPage = Math.max(1, endPage - 4);
    }

    let html = '';

    if (totalPages > 1) {
        html += `
            <nav class="flex items-center justify-center gap-2" aria-label="Pagination" data-pagination>
                <a href="#" data-page="${currentPage - 1}" class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''} transition-colors" ${currentPage === 1 ? 'aria-disabled="true"' : ''}>
                    <i class="fa-solid fa-chevron-left"></i>
                    <span class="hidden sm:inline ml-1">Previous</span>
                </a>
                <div class="flex items-center gap-1">
        `;

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <a href="#" data-page="${i}" class="min-w-[44px] h-11 flex items-center justify-center rounded-lg text-sm font-medium ${i === currentPage ? 'bg-rose-500 text-white' : 'text-gray-700 hover:bg-gray-100'} transition-colors" ${i === currentPage ? 'aria-current="page"' : ''}>
                    ${i}
                </a>
            `;
        }

        html += `
                </div>
                <a href="#" data-page="${currentPage + 1}" class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 pointer-events-none cursor-not-allowed' : ''} transition-colors" ${currentPage === totalPages ? 'aria-disabled="true"' : ''}>
                    <span class="hidden sm:inline mr-1">Next</span>
                    <i class="fa-solid fa-chevron-right"></i>
                </a>
            </nav>
        `;
    }

    html += `
        <div class="mt-4 text-center text-sm text-gray-500">
            Showing ${((currentPage - 1) * limit) + 1} to ${Math.min(currentPage * limit, totalCount)} of ${totalCount} customers
        </div>
    `;

    return html;
}

// Main User Loading Logic
async function loadUsers(page = 1, paramsOverride = null) {
    const params = paramsOverride || getFilterParams();
    params.page = page;

    const newUrl = buildUrl(params);
    window.history.pushState({}, '', newUrl);

    updateFilterInputs(params);

    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = renderLoadingState();

    try {
        const response = await fetch(`/admin/userList${newUrl}`, {
            headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            if (data.users && data.users.length > 0) {
                tbody.innerHTML = data.users.map((user, index) => renderUserRow(user, index, params)).join('');
            } else {
                tbody.innerHTML = renderEmptyState();
            }

            const paginationContainer = document.getElementById('paginationContainer');
            if (paginationContainer) {
                paginationContainer.innerHTML = renderPagination(data.currentPage, data.totalPages, data.totalCount, data.limit, params);
            }

            updateClearFiltersButton(params);
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-red-400">${data.message || 'Failed to load users'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-red-400">Failed to load users. Please try again.</td></tr>`;
    }
}

function clearFilters() {
    const params = { page: 1, search: '', status: '', startDate: '', endDate: '' };
    window.history.pushState({}, '', buildUrl(params));
    updateFilterInputs(params);
    loadUsers(1, params);
}

// Toggle User (Block/Unblock)
async function toggleUser(userId) {
    const row = event?.target?.closest('tr');
    const isCurrentlyBlocked = row?.querySelector('td:nth-child(5) span')?.textContent?.trim() === 'Blocked';

    const action = isCurrentlyBlocked ? 'unblock' : 'block';
    const actionTitle = isCurrentlyBlocked ? 'Unblock' : 'Block';

    const { isConfirmed } = await Swal.fire({
        title: `${actionTitle} User?`,
        text: `Are you sure you want to ${action} this user?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: `Yes, ${action} them`,
        cancelButtonText: 'Cancel',
        confirmButtonColor: isCurrentlyBlocked ? '#16a34a' : '#dc2626',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
    });

    if (!isConfirmed) return;

    const endpoint = isCurrentlyBlocked ? 'unblocked' : 'blocked';

    try {
        const response = await fetch(`/admin/userList/${endpoint}/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 }).fire({
                icon: 'success',
                title: data.message
            });
            setTimeout(() => loadUsers(getFilterParams().page), 1000);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (err) {
        console.error(`Error in toggleUser: ${err.message}`);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Something went wrong. Please try again.' });
    }
}

// Event Listeners
const debouncedSearch = debounce((value) => {
    const params = getFilterParams();
    params.search = value;
    params.page = 1;
    loadUsers(1, params);
}, 700);

function initEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const params = getFilterParams();
                params.search = e.target.value;
                params.page = 1;
                loadUsers(1, params);
            }
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            const params = getFilterParams();
            params.status = e.target.value;
            params.page = 1;
            loadUsers(1, params);
        });
    }

    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    function validateDates() {
        const fromVal = startDate?.value || '';
        const toVal = endDate?.value || '';

        // Update min/max constraints dynamically
        if (startDate) startDate.max = toVal || new Date().toISOString().split('T')[0];
        if (endDate) endDate.min = fromVal || '';

        // Validate: From must be <= To
        if (fromVal && toVal && fromVal > toVal) {
            Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }).fire({
                icon: 'error',
                title: '"From" date cannot be after "To" date'
            });
            return false;
        }

        return true;
    }

    function onDateChange() {
        if (!validateDates()) return;

        const params = getFilterParams();
        params.startDate = startDate?.value || '';
        params.endDate = endDate?.value || '';
        params.page = 1;
        loadUsers(1, params);
    }

    if (startDate) startDate.addEventListener('change', onDateChange);
    if (endDate) endDate.addEventListener('change', onDateChange);

    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);

    window.addEventListener('popstate', () => {
        const params = getFilterParams();
        updateFilterInputs(params);
        loadUsers(params.page);
    });

    document.getElementById('paginationContainer')?.addEventListener('click', (e) => {
        const link = e.target.closest('[data-page]');
        if (!link) return;
        e.preventDefault();
        const page = parseInt(link.dataset.page);
        if (page < 1 || page > gTotalPages) return;
        loadUsers(page);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    const params = getFilterParams();
    updateClearFiltersButton(params);
    if (params.search || params.status || params.startDate || params.endDate || params.page > 1) {
        updateFilterInputs(params);
        loadUsers(params.page);
    }
});

window.toggleUser = toggleUser;
window.loadUsers = loadUsers;
window.clearFilters = clearFilters;
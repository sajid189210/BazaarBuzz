document.querySelector('#homeSearch')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const searchInput = this.value.trim();
        if (!searchInput) return;
        window.location.href = '/user/getProductList/search';
    }
});

document.querySelector('#homeSearchMobile')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const searchInput = this.value.trim();
        if (!searchInput) return;
        window.location.href = '/user/getProductList/search';
    }
});

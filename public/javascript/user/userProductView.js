const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    didOpen: (toast) => { toast.onmouseenter = Swal.stopTimer; toast.onmouseleave = Swal.resumeTimer; }
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let currentModalIndex = 0;
let selectedSize = null;
let selectedColor = null;
let maxAvailableStock = 0;
let mobileStickyBarVisible = false;

function initProductPage() {
    const data = window.productData;
    if (!data) return;

    const sizeChips = document.querySelectorAll('#sizeChips .size-chip:not(.out-of-stock)');
    if (sizeChips.length > 0) {
        const firstChip = sizeChips[0];
        selectSize(firstChip, firstChip.dataset.size, parseInt(firstChip.dataset.stock));
    }

    document.getElementById('cart-form')?.addEventListener('submit', handleAddToCart);
    
    document.addEventListener('keydown', handleModalKeydown);
    
    document.getElementById('imageModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'imageModal') closeImageModal();
    });
    
    document.getElementById('sizeGuideModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'sizeGuideModal') closeSizeGuide();
    });

    setupMobileStickyBar();

    initScrollReveal();

    initSizeChipPhysics();

    initGalleryZoom();

    initImageSwipe();
}

// ==================== MOBILE STICKY BAR ====================
function setupMobileStickyBar() {
    const stickyBar = document.getElementById('mobileStickyBar');
    const buyBox = document.querySelector('.buy-box');
    if (!stickyBar || !buyBox) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                stickyBar.classList.add('visible');
                stickyBar.setAttribute('aria-hidden', 'false');
            } else {
                stickyBar.classList.remove('visible');
                stickyBar.setAttribute('aria-hidden', 'true');
            }
        });
    }, { rootMargin: '-100px 0px 0px 0px' });

    observer.observe(buyBox);
}

// ==================== SCROLL REVEAL ANIMATIONS ====================
function initScrollReveal() {
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.carousel-card[style*="animation"]').forEach(card => {
        card.style.animationPlayState = 'paused';
        observer.observe(card);
    });
}

// ==================== SIZE CHIP MICRO-PHYSICS ====================
function initSizeChipPhysics() {
    if (prefersReducedMotion) return;

    const chips = document.querySelectorAll('#sizeChips .size-chip:not(.out-of-stock)');
    chips.forEach(chip => {
        chip.addEventListener('mousemove', (e) => {
            if (chip.classList.contains('selected') || chip.disabled) return;
            const rect = chip.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            const rotateX = (y / rect.height) * -4;
            const rotateY = (x / rect.width) * 4;
            chip.style.transform = `perspective(400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
        });
        chip.addEventListener('mouseleave', () => {
            if (chip.classList.contains('selected')) return;
            chip.style.transform = '';
        });
        chip.addEventListener('mousedown', () => {
            if (chip.disabled) return;
            chip.style.transform = 'scale(0.96)';
        });
        chip.addEventListener('mouseup', () => {
            if (chip.disabled) return;
            chip.style.transform = '';
        });
    });
}

// ==================== IMAGE GALLERY MODAL ====================
function openImageModal(index) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');
    const images = window.productData.images;
    
    if (!images || images.length === 0) return;
    
    currentModalIndex = index;
    modalImage.src = images[currentModalIndex];
    modalImage.alt = `Product image ${currentModalIndex + 1}`;
    modalCounter.textContent = `${currentModalIndex + 1} / ${images.length}`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (!prefersReducedMotion) {
        modalImage.style.transform = 'scale(0.95)';
        modalImage.style.opacity = '0';
        requestAnimationFrame(() => {
            modalImage.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms cubic-bezier(0.16, 1, 0.3, 1)';
            modalImage.style.transform = 'scale(1)';
            modalImage.style.opacity = '1';
        });
    }
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateModal(direction) {
    const images = window.productData.images;
    if (!images || images.length <= 1) return;
    
    currentModalIndex = (currentModalIndex + direction + images.length) % images.length;
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');
    
    if (!prefersReducedMotion) {
        modalImage.style.transition = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)';
        modalImage.style.transform = direction > 0 ? 'translateX(-20px)' : 'translateX(20px)';
        modalImage.style.opacity = '0.5';
        
        setTimeout(() => {
            modalImage.src = images[currentModalIndex];
            modalImage.alt = `Product image ${currentModalIndex + 1}`;
            modalCounter.textContent = `${currentModalIndex + 1} / ${images.length}`;
            modalImage.style.transform = 'translateX(0)';
            modalImage.style.opacity = '1';
        }, 150);
    } else {
        modalImage.src = images[currentModalIndex];
        modalImage.alt = `Product image ${currentModalIndex + 1}`;
        modalCounter.textContent = `${currentModalIndex + 1} / ${images.length}`;
    }
    
    updateThumbnailActive(currentModalIndex);
}

function handleModalKeydown(e) {
    const modal = document.getElementById('imageModal');
    if (!modal.classList.contains('active')) return;
    
    if (e.key === 'Escape') closeImageModal();
    else if (e.key === 'ArrowLeft') navigateModal(-1);
    else if (e.key === 'ArrowRight') navigateModal(1);
}

function selectThumbnail(index, btn) {
    const mainImage = document.getElementById('mainImage');
    const images = window.productData.images;
    
    if (!images || !images[index]) return;
    
    if (typeof window.exitGalleryZoom === 'function') {
        window.exitGalleryZoom();
    }
    
    currentModalIndex = index;
    
    if (!prefersReducedMotion) {
        mainImage.style.transition = 'opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)';
        mainImage.style.opacity = '0';
        setTimeout(() => {
            mainImage.src = images[index];
            mainImage.alt = `Product image ${index + 1}`;
            mainImage.style.opacity = '1';
        }, 150);
    } else {
        mainImage.src = images[index];
        mainImage.alt = `Product image ${index + 1}`;
    }
    
    updateThumbnailActive(index);
}

function updateThumbnailActive(index) {
    document.querySelectorAll('.thumb-btn').forEach((b, i) => {
        b.classList.toggle('active', i === index);
        b.setAttribute('aria-selected', i === index);
    });
}

// ==================== IMAGE ZOOM IN-PLACE (Amazon-style) ====================
let zoomState = {
    active: false,
    dragging: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    zoomLevel: 2.5
};

function initGalleryZoom() {
    const container = document.getElementById('mainImageContainer');
    const img = document.getElementById('mainImage');
    if (!container || !img) return;

    function enterZoom(clientX, clientY) {
        zoomState.active = true;
        container.classList.add('zoomed');
        const rect = container.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = `${x}% ${y}%`;
        img.style.transition = 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)';
        img.style.transform = `scale(${zoomState.zoomLevel})`;
        img.style.cursor = 'grab';
        zoomState.offsetX = 0;
        zoomState.offsetY = 0;
    }

    function exitZoom() {
        zoomState.active = false;
        zoomState.dragging = false;
        container.classList.remove('zoomed');
        img.style.transform = '';
        img.style.transformOrigin = '';
        img.style.transition = 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)';
        img.style.cursor = 'zoom-in';
        zoomState.offsetX = 0;
        zoomState.offsetY = 0;
    }
    window.exitGalleryZoom = exitZoom;

    function startDrag(clientX, clientY) {
        zoomState.dragging = true;
        zoomState.hasMoved = false;
        zoomState.startX = clientX - zoomState.offsetX;
        zoomState.startY = clientY - zoomState.offsetY;
        img.style.cursor = 'grabbing';
        img.style.transition = 'none';
        img.style.transformOrigin = 'center center';
        img.style.transform = `translate(${zoomState.offsetX}px, ${zoomState.offsetY}px) scale(${zoomState.zoomLevel})`;
    }

    function moveDrag(clientX, clientY) {
        if (!zoomState.dragging || !zoomState.active) return;
        const dx = clientX - zoomState.startX - zoomState.offsetX;
        const dy = clientY - zoomState.startY - zoomState.offsetY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) zoomState.hasMoved = true;
        zoomState.offsetX = clientX - zoomState.startX;
        zoomState.offsetY = clientY - zoomState.startY;
        img.style.transform = `translate(${zoomState.offsetX}px, ${zoomState.offsetY}px) scale(${zoomState.zoomLevel})`;
    }

    function endDrag() {
        if (zoomState.dragging) {
            zoomState.dragging = false;
            if (zoomState.active) {
                img.style.cursor = 'grab';
                img.style.transition = '';
            }
        }
    }

    container.addEventListener('click', function (e) {
        if (zoomState.hasMoved) {
            zoomState.hasMoved = false;
            return;
        }
        if (swipeState.justSwiped) {
            swipeState.justSwiped = false;
            return;
        }
        if (!zoomState.active) {
            enterZoom(e.clientX, e.clientY);
        } else {
            exitZoom();
        }
    });

    container.addEventListener('mousedown', function (e) {
        if (!zoomState.active) return;
        startDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', function (e) {
        if (!zoomState.dragging || !zoomState.active) return;
        e.preventDefault();
        moveDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', function () {
        endDrag();
    });

    container.addEventListener('touchstart', function (e) {
        if (!zoomState.active) return;
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
    }, { passive: false });

    container.addEventListener('touchmove', function (e) {
        if (!zoomState.dragging || !zoomState.active) return;
        e.preventDefault();
        const touch = e.touches[0];
        moveDrag(touch.clientX, touch.clientY);
    }, { passive: false });

    container.addEventListener('touchend', function (e) {
        endDrag();
    }, { passive: true });

    container.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && zoomState.active) {
            exitZoom();
        }
        if ((e.key === 'Enter' || e.key === ' ') && !zoomState.active) {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            enterZoom(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
    });
}

// ==================== IMAGE SWIPE (Mobile) ====================
let swipeState = {
    startX: 0,
    startY: 0,
    isSwiping: false,
    justSwiped: false
};

function initImageSwipe() {
    const container = document.getElementById('mainImageContainer');
    const images = window.productData.images;
    if (!container || !images || images.length <= 1) return;

    container.addEventListener('touchstart', function (e) {
        swipeState.startX = e.touches[0].clientX;
        swipeState.startY = e.touches[0].clientY;
        swipeState.isSwiping = false;
        swipeState.justSwiped = false;
    }, { passive: true });

    container.addEventListener('touchmove', function (e) {
        const dx = e.touches[0].clientX - swipeState.startX;
        const dy = e.touches[0].clientY - swipeState.startY;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            swipeState.isSwiping = true;
        }
    }, { passive: true });

    container.addEventListener('touchend', function (e) {
        if (!swipeState.isSwiping) return;
        swipeState.justSwiped = true;
        if (zoomState.active) {
            swipeState.isSwiping = false;
            return;
        }
        const dx = e.changedTouches[0].clientX - swipeState.startX;
        if (Math.abs(dx) > 50) {
            const direction = dx > 0 ? -1 : 1;
            const newIndex = currentModalIndex + direction;
            if (newIndex >= 0 && newIndex < images.length) {
                const thumbBtns = document.querySelectorAll('.thumb-btn');
                if (thumbBtns[newIndex]) {
                    selectThumbnail(newIndex, thumbBtns[newIndex]);
                }
            }
        }
        swipeState.isSwiping = false;
    }, { passive: true });
}

// ==================== SIZE / COLOR SELECTION ====================
function selectSize(btn, size, stock) {
    document.querySelectorAll('#sizeChips .size-chip.selected').forEach(b => {
        if (b !== btn) {
            b.classList.remove('selected');
            b.setAttribute('aria-checked', 'false');
            if (!prefersReducedMotion) {
                b.style.transition = 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)';
                b.style.transform = 'scale(0.95)';
                setTimeout(() => b.style.transform = '', 150);
            }
        }
    });
    
    btn.classList.add('selected');
    btn.setAttribute('aria-checked', 'true');
    if (!prefersReducedMotion) {
        btn.style.transform = 'scale(1.05)';
        setTimeout(() => {
            btn.style.transition = 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)';
            btn.style.transform = '';
        }, 100);
    }
    
    selectedSize = size;
    document.getElementById('selectedSize').value = size;
    
    maxAvailableStock = stock;
    updateQuantityMax(stock);
    
    populateColors(size);
    
    updateStockDisplay(stock);
}

function populateColors(size) {
    const colorSwatches = document.getElementById('colorSwatches');
    const colorSection = document.getElementById('colorSection');
    const variants = window.productData.variants;
    const sizeColorStock = window.productData.sizeColorStock;
    
    const variant = variants.find(v => v.size === size);
    if (!variant || !variant.colors || variant.colors.length === 0) {
        colorSection.style.display = 'none';
        selectedColor = null;
        document.getElementById('selectedColor').value = '';
        return;
    }
    
    colorSection.style.display = '';
    colorSwatches.innerHTML = '';
    
    variant.colors.forEach((color, idx) => {
        const stock = sizeColorStock[size]?.[color] || 0;
        const isOutOfStock = stock <= 0;
        
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = `color-swatch ${idx === 0 && !isOutOfStock ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}`;
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;
        swatch.dataset.stock = stock;
        swatch.disabled = isOutOfStock;
        swatch.setAttribute('role', 'radio');
        swatch.setAttribute('aria-checked', idx === 0 && !isOutOfStock ? 'true' : 'false');
        swatch.setAttribute('aria-label', `${color} ${isOutOfStock ? '(out of stock)' : ''}`);
        swatch.onclick = () => selectColor(swatch, color, stock);
        
        const tooltip = document.createElement('span');
        tooltip.className = 'color-tooltip';
        const colorName = (typeof ntc !== 'undefined') ? ntc.name(color)[1] : color;
        tooltip.textContent = colorName;
        swatch.style.position = 'relative';
        swatch.appendChild(tooltip);
        
        colorSwatches.appendChild(swatch);
        
        if (!prefersReducedMotion) {
            swatch.style.opacity = '0';
            swatch.style.transform = 'scale(0.8) translateY(10px)';
            requestAnimationFrame(() => {
                swatch.style.transition = 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)';
                swatch.style.transitionDelay = `${idx * 40}ms`;
                swatch.style.opacity = '1';
                swatch.style.transform = 'scale(1) translateY(0)';
            });
        }
    });
    
    const firstAvailable = colorSwatches.querySelector('.color-swatch:not(.out-of-stock)');
    if (firstAvailable) {
        selectColor(firstAvailable, firstAvailable.dataset.color, parseInt(firstAvailable.dataset.stock));
    } else {
        selectedColor = null;
        document.getElementById('selectedColor').value = '';
    }
}

function selectColor(btn, color, stock) {
    document.querySelectorAll('#colorSwatches .color-swatch').forEach(b => {
        if (b !== btn) {
            b.classList.remove('selected');
            b.setAttribute('aria-checked', 'false');
        }
    });
    btn.classList.add('selected');
    btn.setAttribute('aria-checked', 'true');
    
    if (!prefersReducedMotion) {
        btn.style.transform = 'scale(1.15)';
        setTimeout(() => btn.style.transform = '', 150);
    }
    
    selectedColor = color;
    document.getElementById('selectedColor').value = color;
    
    maxAvailableStock = stock;
    updateQuantityMax(stock);
    updateStockDisplay(stock);
}

function updateStockDisplay(stock) {
    const badge = document.getElementById('stockBadge');
    const text = document.getElementById('stockText');
    const barFill = document.getElementById('stockBarFill');
    const barWrap = document.getElementById('stockBarWrap');
    
    if (stock <= 0) {
        badge.className = 'stock-badge out-of-stock';
        badge.textContent = 'Out of Stock';
        text.textContent = 'This variant is currently unavailable';
        barFill.style.width = '0%';
        barWrap.style.display = 'none';
    } else if (stock <= 5) {
        badge.className = 'stock-badge low-stock';
        badge.textContent = 'Low Stock';
        text.textContent = `Only ${stock} left`;
        barWrap.style.display = '';
        barFill.style.width = `${Math.round(stock / 5 * 100)}%`;
        barFill.style.background = 'var(--warning, #f59e0b)';
    } else {
        const pct = Math.min(stock / 50 * 100, 100);
        badge.className = 'stock-badge in-stock';
        badge.textContent = 'In Stock';
        text.textContent = `${stock} available`;
        barWrap.style.display = '';
        barFill.style.width = `${Math.round(pct)}%`;
        barFill.style.background = 'var(--success, #16a34a)';
    }
    
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (stock <= 0) {
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Out of Stock';
    } else {
        addToCartBtn.disabled = false;
        addToCartBtn.textContent = 'Add to Cart';
    }
}

function updateQuantityMax(maxStock) {
    const hint = document.getElementById('maxStockHint');
    const qtyValue = document.getElementById('quantityValue');
    const qtyInput = document.getElementById('quantity');
    const currentQty = parseInt(qtyInput.value) || 1;
    
    if (maxStock <= 0) {
        hint.textContent = 'Out of stock';
        qtyValue.textContent = '0';
        qtyInput.value = '0';
    } else {
        if (currentQty > maxStock) {
            qtyValue.textContent = maxStock;
            qtyInput.value = maxStock;
        }
        hint.textContent = `Max: ${maxStock}`;
    }
}

function incrementQuantity() {
    const input = document.getElementById('quantity');
    const display = document.getElementById('quantityValue');
    let val = parseInt(input.value) || 1;
    if (val < maxAvailableStock) { 
        val++; 
        input.value = val; 
        display.textContent = val; 
        if (!prefersReducedMotion) {
            display.style.transform = 'scale(1.2)';
            setTimeout(() => display.style.transform = '', 100);
        }
    }
}

function decrementQuantity() {
    const input = document.getElementById('quantity');
    const display = document.getElementById('quantityValue');
    let val = parseInt(input.value) || 1;
    if (val > 1) { 
        val--; 
        input.value = val; 
        display.textContent = val; 
        if (!prefersReducedMotion) {
            display.style.transform = 'scale(1.2)';
            setTimeout(() => display.style.transform = '', 100);
        }
    }
}

// ==================== WISHLIST ====================
async function toggleWishList(productId) {
    if (!productId) return;
    
    const btn = document.getElementById('wishlistBtn');
    const isCurrentlyInWishlist = btn.classList.contains('filled');
    
    if (!prefersReducedMotion) {
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => btn.style.transform = '', 100);
    }
    
    try {
        const res = await fetch('/user/wishlist', { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ productId }) 
        });
        const data = await res.json();
        
        if (!data.session) { 
            await Swal.fire({ title: 'Sign In!', text: data.message, icon: 'info' }); 
            window.location.href = data.redirectUrl; 
            return; 
        }
        
        if (!data.success) { 
            await Swal.fire({ title: 'Failed', text: data.message, icon: 'warning' }); 
            if (data.redirectUrl) window.location.href = data.redirectUrl; 
            return; 
        }
        
        btn.classList.toggle('filled');
        btn.setAttribute('aria-label', isCurrentlyInWishlist ? 'Add to wishlist' : 'Remove from wishlist');
        
        if (!prefersReducedMotion && !isCurrentlyInWishlist) {
            btn.querySelector('svg').style.transform = 'scale(1.3)';
            setTimeout(() => {
                btn.querySelector('svg').style.transition = 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)';
                btn.querySelector('svg').style.transform = 'scale(1)';
            }, 50);
        }
        
        Toast.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 })
            .fire({ icon: 'success', title: data.message });
            
    } catch (e) { 
        console.log(e); 
        Toast.fire({ icon: 'error', title: 'Something went wrong' }); 
    }
}

// ==================== TABS ====================
function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isActive = btn.getAttribute('aria-controls') === `tab-${tabName}`;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
    });
    
    document.querySelectorAll('.tab-panel').forEach(panel => {
        const isActive = panel.id === `tab-${tabName}`;
        if (isActive) {
            panel.classList.add('active');
            if (!prefersReducedMotion) {
                panel.style.animation = 'none';
                requestAnimationFrame(() => {
                    panel.style.animation = 'fadeIn 250ms cubic-bezier(0.16, 1, 0.3, 1)';
                });
            }
        } else {
            panel.classList.remove('active');
        }
    });
}

// ==================== SIZE GUIDE MODAL ====================
function openSizeGuide() {
    const modal = document.getElementById('sizeGuideModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSizeGuide() {
    const modal = document.getElementById('sizeGuideModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== ADD TO CART ====================
async function handleAddToCart(e) {
    e.preventDefault();
    
    if (!selectedSize) {
        Toast.fire({ icon: 'warning', title: 'Please select a size' });
        return;
    }
    
    if (!selectedColor) {
        Toast.fire({ icon: 'warning', title: 'Please select a color' });
        return;
    }
    
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    if (quantity <= 0 || quantity > maxAvailableStock) {
        Toast.fire({ icon: 'warning', title: `Please select quantity between 1 and ${maxAvailableStock}` });
        return;
    }
    
    const productId = document.querySelector('input[name="productId"]').value;
    
    const btn = document.getElementById('addToCartBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Adding...';
    if (!prefersReducedMotion) {
        btn.style.opacity = '0.8';
    }
    
    try {
        const response = await fetch('/user/cart', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, size: selectedSize, color: selectedColor, quantity })
        });

        const data = await response.json();

        if (!data.session) {
            await Swal.fire({ title: 'You are not Signed In!', text: data.message, icon: 'info', confirmButtonText: 'Sign In' });
            window.location.href = data.redirectUrl;
            return;
        }

        if (!data.success) {
            await Swal.fire({ title: 'Error', text: data.message, icon: 'error', confirmButtonText: 'Ok' });
            btn.disabled = false;
            btn.textContent = originalText;
            btn.style.opacity = '';
            return;
        }

        await Swal.fire({ title: 'Added to Cart!', text: data.message, icon: 'success', confirmButtonText: 'View Cart' });
        window.location.href = data.redirectUrl || '/user/cart';

    } catch (err) {
        console.log('Error adding to cart.', err);
        Toast.fire({ icon: 'error', title: 'Something went wrong' });
        btn.disabled = false;
        btn.textContent = originalText;
        btn.style.opacity = '';
    }
}
function getCategories() {
  const el = document.getElementById('categoriesData');
  return el ? JSON.parse(el.textContent) : [];
}

function getOffers() {
  const el = document.getElementById('offersData');
  return el ? JSON.parse(el.textContent) : [];
}

function categoryBrandOptions(selectedCategory, selectedBrand) {
  const cats = getCategories();
  let catOptions = '<option value="">Select Category</option>';
  let brandOptions = '<option value="">Select Brand</option>';

  cats.forEach(c => {
    const sel = c.title === selectedCategory ? 'selected' : '';
    catOptions += `<option value="${c.title}" ${sel}>${c.title}</option>`;
  });

  if (selectedCategory) {
    const cat = cats.find(c => c.title === selectedCategory);
    if (cat && cat.brands) {
      brandOptions = '<option value="">Select Brand</option>';
      cat.brands.forEach(b => {
        const sel = b === selectedBrand ? 'selected' : '';
        brandOptions += `<option value="${b}" ${sel}>${b}</option>`;
      });
    }
  }

  return { catOptions, brandOptions, categories: cats };
}

function openCreateOfferModal() {
  const { catOptions, brandOptions } = categoryBrandOptions('', '');

  Swal.fire({
    title: 'Create Offer',
    html: `
      <div style="text-align:left;padding:4px 0">
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px">Category</label>
          <select id="swal-category" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;outline:none;box-sizing:border-box;transition:border-color .15s"
            onfocus="this.style.borderColor='#f43f5e';this.style.boxShadow='0 0 0 3px rgba(244,63,94,.15)'"
            onblur="this.style.borderColor='#d1d5db';this.style.boxShadow='none'">
            ${catOptions}
          </select>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px">Brand</label>
          <select id="swal-brand" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;outline:none;box-sizing:border-box;transition:border-color .15s"
            onfocus="this.style.borderColor='#f43f5e';this.style.boxShadow='0 0 0 3px rgba(244,63,94,.15)'"
            onblur="this.style.borderColor='#d1d5db';this.style.boxShadow='none'">
            ${brandOptions}
          </select>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px">Offer Name</label>
          <input id="swal-offerName" type="text" placeholder="e.g. Summer Sale"
            style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-sizing:border-box;transition:border-color .15s"
            onfocus="this.style.borderColor='#f43f5e';this.style.boxShadow='0 0 0 3px rgba(244,63,94,.15)'"
            onblur="this.style.borderColor='#d1d5db';this.style.boxShadow='none'">
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px">Discount %</label>
          <input id="swal-discount" type="number" placeholder="e.g. 25" min="1" max="100"
            style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-sizing:border-box;transition:border-color .15s"
            onfocus="this.style.borderColor='#f43f5e';this.style.boxShadow='0 0 0 3px rgba(244,63,94,.15)'"
            onblur="this.style.borderColor='#d1d5db';this.style.boxShadow='none'">
        </div>
      </div>`,
    showCancelButton: true,
    confirmButtonText: 'Create',
    confirmButtonColor: '#111827',
    cancelButtonColor: '#6b7280',
    didOpen: () => {
      document.getElementById('swal-category').addEventListener('change', function () {
        const { brandOptions: brands } = categoryBrandOptions(this.value, '');
        document.getElementById('swal-brand').innerHTML = brands;
      });
    },
    preConfirm: () => ({
      category: document.getElementById('swal-category').value,
      brandName: document.getElementById('swal-brand').value,
      offerName: document.getElementById('swal-offerName').value,
      discountValue: document.getElementById('swal-discount').value,
    })
  }).then(async (result) => {
    if (!result.isConfirmed) return;
    const { category, brandName, offerName, discountValue } = result.value;
    if (!category || !brandName || !offerName || !discountValue) {
      Swal.fire({ title: 'Error', text: 'All fields are required.', icon: 'error' });
      return;
    }
    try {
      const res = await fetch('/admin/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: data.message, showConfirmButton: false, timer: 1500 });
        setTimeout(() => location.reload(), 1500);
      } else {
        Swal.fire({ title: 'Error', text: data.message, icon: 'error' });
      }
    } catch (e) { console.log(e); Swal.fire({ title: 'Error', text: 'Something went wrong.', icon: 'error' }); }
  });
}

async function editOffer(id) {
  const offer = getOffers().find(o => o._id === id);
  if (!offer) return;

  const catTitle = offer.category?.title || offer.category || '';
  const { catOptions, brandOptions } = categoryBrandOptions(catTitle, offer.brandName);

  Swal.fire({
    title: 'Edit Offer',
    html: `
      <div style="text-align:left;padding:4px 0">
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px">Category</label>
          <select id="swal-category" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;outline:none;box-sizing:border-box;transition:border-color .15s"
            onfocus="this.style.borderColor='#f43f5e';this.style.boxShadow='0 0 0 3px rgba(244,63,94,.15)'"
            onblur="this.style.borderColor='#d1d5db';this.style.boxShadow='none'">
            ${catOptions}
          </select>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px">Brand</label>
          <select id="swal-brand" style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;background:#fff;outline:none;box-sizing:border-box;transition:border-color .15s"
            onfocus="this.style.borderColor='#f43f5e';this.style.boxShadow='0 0 0 3px rgba(244,63,94,.15)'"
            onblur="this.style.borderColor='#d1d5db';this.style.boxShadow='none'">
            ${brandOptions}
          </select>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px">Offer Name</label>
          <input id="swal-offerName" type="text" placeholder="e.g. Summer Sale" value="${offer.offerName}"
            style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-sizing:border-box;transition:border-color .15s"
            onfocus="this.style.borderColor='#f43f5e';this.style.boxShadow='0 0 0 3px rgba(244,63,94,.15)'"
            onblur="this.style.borderColor='#d1d5db';this.style.boxShadow='none'">
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px">Discount %</label>
          <input id="swal-discount" type="number" placeholder="e.g. 25" min="1" max="100" value="${offer.discount}"
            style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-sizing:border-box;transition:border-color .15s"
            onfocus="this.style.borderColor='#f43f5e';this.style.boxShadow='0 0 0 3px rgba(244,63,94,.15)'"
            onblur="this.style.borderColor='#d1d5db';this.style.boxShadow='none'">
        </div>
      </div>`,
    showCancelButton: true,
    confirmButtonText: 'Save',
    confirmButtonColor: '#111827',
    cancelButtonColor: '#6b7280',
    didOpen: () => {
      document.getElementById('swal-category').addEventListener('change', function () {
        const { brandOptions: brands } = categoryBrandOptions(this.value, '');
        document.getElementById('swal-brand').innerHTML = brands;
      });
    },
    preConfirm: () => ({
      offerId: id,
      category: document.getElementById('swal-category').value,
      brandName: document.getElementById('swal-brand').value,
      offerName: document.getElementById('swal-offerName').value,
      discountValue: document.getElementById('swal-discount').value,
    })
  }).then(async (result) => {
    if (!result.isConfirmed) return;
    const { category, brandName, offerName, discountValue } = result.value;
    if (!category || !brandName || !offerName || !discountValue) {
      Swal.fire({ title: 'Error', text: 'All fields are required.', icon: 'error' });
      return;
    }
    try {
      const res = await fetch('/admin/offer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.value)
      });
      const data = await res.json();
      if (data.success) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: data.message, showConfirmButton: false, timer: 1500 });
        setTimeout(() => location.reload(), 1500);
      } else {
        Swal.fire({ title: 'Error', text: data.message, icon: 'error' });
      }
    } catch (e) { console.log(e); Swal.fire({ title: 'Error', text: 'Something went wrong.', icon: 'error' }); }
  });
}

async function toggleOffer(id) {
  try {
    const { isConfirmed } = await Swal.fire({ title: 'Toggle?', text: 'Toggle offer status?', icon: 'warning', showCancelButton: true });
    if (!isConfirmed) return;
    const res = await fetch('/admin/offer/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offerId: id }) });
    const data = await res.json();
      if (data.success) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: data.message, showConfirmButton: false, timer: 1500 });
        setTimeout(() => location.reload(), 1500);
      }
    else Swal.fire({ title: 'Error', text: data.message, icon: 'error' });
  } catch (e) { console.log(e); Swal.fire({ title: 'Error', text: 'Something went wrong.', icon: 'error' }); }
}

async function deleteOffer(id) {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete Offer?',
    text: 'This will deactivate the offer.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#e53e3e',
    cancelButtonText: 'Cancel'
  });
  if (!isConfirmed) return;
  try {
    const res = await fetch('/admin/offer/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Offer deleted successfully', showConfirmButton: false, timer: 1500 });
      setTimeout(() => location.reload(), 1500);
    } else {
      Swal.fire({ title: 'Error', text: data.message || 'Failed to delete offer', icon: 'error' });
    }
  } catch (e) { console.log(e); Swal.fire({ title: 'Error', text: 'Something went wrong.', icon: 'error' }); }
}

window.deleteOffer = deleteOffer;
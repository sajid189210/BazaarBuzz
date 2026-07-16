const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });

function getCoupons() {
  const el = document.getElementById('couponsData');
  return el ? JSON.parse(el.textContent) : [];
}

const inputStyle = 'width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;color:#111827;outline:none;box-sizing:border-box;transition:border-color .15s';
const inputFocus = "this.style.borderColor='#f43f5e';this.style.boxShadow='0 0 0 3px rgba(244,63,94,.15)'";
const inputBlur = "this.style.borderColor='#d1d5db';this.style.boxShadow='none'";
const selectStyle = inputStyle + ';background:#fff';
const labelStyle = 'display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px';

function fieldWrap(label, html) {
  return `<div style="margin-bottom:16px">${label}${html}</div>`;
}

function makeInput(id, placeholder, opts = {}) {
  const type = opts.type || 'text';
  const extra = opts.value ? ` value="${opts.value}"` : '';
  const attrs = opts.min !== undefined ? ` min="${opts.min}"` : '';
  return `<input id="${id}" type="${type}" placeholder="${placeholder}"${extra}${attrs} style="${inputStyle}" onfocus="${inputFocus}" onblur="${inputBlur}">`;
}

function makeSelect(id, optionsHtml) {
  return `<select id="${id}" style="${selectStyle}" onfocus="${inputFocus}" onblur="${inputBlur}">${optionsHtml}</select>`;
}

function openCreateCouponModal() {
  Swal.fire({
    title: 'Create Coupon',
    html: `<div style="text-align:left;padding:4px 0">
      ${fieldWrap(`<label style="${labelStyle}">Coupon Code</label>`, makeInput('swal-code', 'e.g. SUMMER25'))}
      ${fieldWrap(`<label style="${labelStyle}">Type</label>`, makeSelect('swal-type',
        '<option value="percentage">Percentage</option><option value="price">Fixed</option>'))}
      ${fieldWrap(`<label style="${labelStyle}">Value</label>`, makeInput('swal-value', 'e.g. 25', { type: 'number', min: '1' }))}
      ${fieldWrap(`<label style="${labelStyle}">Min Amount (₹)</label>`, makeInput('swal-minAmount', 'e.g. 500', { type: 'number', min: '1' }))}
      ${fieldWrap(`<label style="${labelStyle}">Expiry Date</label>`, makeInput('swal-expiry', '', { type: 'date' }))}
      ${fieldWrap(`<label style="${labelStyle}">Usage Limit</label>`, makeInput('swal-count', 'e.g. 100', { type: 'number', min: '1' }))}
    </div>`,
    showCancelButton: true,
    confirmButtonText: 'Create',
    confirmButtonColor: '#111827',
    cancelButtonColor: '#6b7280',
    preConfirm: () => {
      const vals = {
        couponCode: document.getElementById('swal-code').value,
        couponType: document.getElementById('swal-type').value,
        couponValue: document.getElementById('swal-value').value,
        minAmount: document.getElementById('swal-minAmount').value,
        expiry: document.getElementById('swal-expiry').value,
        count: document.getElementById('swal-count').value,
      };
      if (!vals.couponCode) { Swal.showValidationMessage('Coupon code is required'); return false; }
      if (!vals.couponType) { Swal.showValidationMessage('Coupon type is required'); return false; }
      if (!vals.couponValue) { Swal.showValidationMessage('Coupon value is required'); return false; }
      if (!vals.minAmount) { Swal.showValidationMessage('Minimum amount is required'); return false; }
      if (!vals.expiry) { Swal.showValidationMessage('Expiry date is required'); return false; }
      if (!vals.count) { Swal.showValidationMessage('Usage limit is required'); return false; }
      return fetch('/admin/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vals)
      }).then(res => res.json()).then(data => {
        if (!data.success) {
          Swal.showValidationMessage(data.errors ? Object.values(data.errors).join('<br>') : data.message);
          return false;
        }
        return data;
      }).catch(e => {
        Swal.showValidationMessage(e?.message || 'Something went wrong');
        return false;
      });
    }
  }).then(result => {
    if (result.isConfirmed && result.value) {
      Toast.fire({ icon: 'success', title: result.value.message });
      setTimeout(() => location.reload(), 1500);
    }
  });
}

function editCoupon(id) {
  const coupon = getCoupons().find(c => c._id === id);
  if (!coupon) return;

  const expiryVal = coupon.expiry ? coupon.expiry.split('T')[0] : '';

  Swal.fire({
    title: 'Edit Coupon',
    html: `<div style="text-align:left;padding:4px 0">
      ${fieldWrap(`<label style="${labelStyle}">Coupon Code</label>`, makeInput('swal-code', 'e.g. SUMMER25', { value: coupon.couponCode }))}
      ${fieldWrap(`<label style="${labelStyle}">Type</label>`, makeSelect('swal-type',
        `<option value="percentage" ${coupon.couponType === 'percentage' ? 'selected' : ''}>Percentage</option><option value="price" ${coupon.couponType === 'price' ? 'selected' : ''}>Fixed</option>`))}
      ${fieldWrap(`<label style="${labelStyle}">Value</label>`, makeInput('swal-value', 'e.g. 25', { type: 'number', min: '1', value: coupon.couponValue }))}
      ${fieldWrap(`<label style="${labelStyle}">Min Amount (₹)</label>`, makeInput('swal-minAmount', 'e.g. 500', { type: 'number', min: '1', value: coupon.minAmount }))}
      ${fieldWrap(`<label style="${labelStyle}">Expiry Date</label>`, makeInput('swal-expiry', '', { type: 'date', value: expiryVal }))}
      ${fieldWrap(`<label style="${labelStyle}">Usage Limit</label>`, makeInput('swal-count', 'e.g. 100', { type: 'number', min: '1', value: coupon.count }))}
    </div>`,
    showCancelButton: true,
    confirmButtonText: 'Save',
    confirmButtonColor: '#111827',
    cancelButtonColor: '#6b7280',
    preConfirm: () => {
      const vals = {
        couponId: id,
        couponCode: document.getElementById('swal-code').value,
        couponType: document.getElementById('swal-type').value,
        couponValue: document.getElementById('swal-value').value,
        minAmount: document.getElementById('swal-minAmount').value,
        expiry: document.getElementById('swal-expiry').value,
        count: document.getElementById('swal-count').value,
      };
      if (!vals.couponCode) { Swal.showValidationMessage('Coupon code is required'); return false; }
      if (!vals.couponType) { Swal.showValidationMessage('Coupon type is required'); return false; }
      if (!vals.couponValue) { Swal.showValidationMessage('Coupon value is required'); return false; }
      if (!vals.minAmount) { Swal.showValidationMessage('Minimum amount is required'); return false; }
      if (!vals.expiry) { Swal.showValidationMessage('Expiry date is required'); return false; }
      if (!vals.count) { Swal.showValidationMessage('Usage limit is required'); return false; }
      return fetch('/admin/coupon', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vals)
      }).then(res => res.json()).then(data => {
        if (!data.success) {
          Swal.showValidationMessage(data.errors ? Object.values(data.errors).join('<br>') : data.message);
          return false;
        }
        return data;
      }).catch(e => {
        Swal.showValidationMessage(e?.message || 'Something went wrong');
        return false;
      });
    }
  }).then(result => {
    if (result.isConfirmed && result.value) {
      Toast.fire({ icon: 'success', title: result.value.message });
      setTimeout(() => location.reload(), 1500);
    }
  });
}

async function toggleCouponStatus(id) {
  try {
    const { isConfirmed } = await Swal.fire({ title: 'Toggle Status?', text: "Toggle this coupon's active status?", icon: 'warning', showCancelButton: true });
    if (!isConfirmed) return;
    const res = await fetch('/admin/coupon/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ couponId: id }) });
    const data = await res.json();
    if (data.success) {
      Toast.fire({ icon: 'success', title: data.message });
      setTimeout(() => location.reload(), 1500);
    } else {
      Toast.fire({ icon: 'error', title: data.message });
    }
  } catch (e) { console.log(e); Toast.fire({ icon: 'error', title: e?.message || 'Something went wrong' }); }
}

async function deleteCoupon(id) {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete Coupon?',
    text: 'This will deactivate the coupon.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#e53e3e',
    cancelButtonText: 'Cancel'
  });
  if (!isConfirmed) return;
  try {
    const res = await fetch('/admin/coupon?couponId=' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      Toast.fire({ icon: 'success', title: data.message });
      setTimeout(() => location.reload(), 1500);
    } else {
      Toast.fire({ icon: 'error', title: data.message || 'Failed to delete coupon' });
    }
  } catch (e) { console.log(e); Toast.fire({ icon: 'error', title: e?.message || 'Something went wrong' }); }
}

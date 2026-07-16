let confirmPassword = false;
let oldPassword = false;
let newPassword = false;
let emailInput = false;

/******************************************[Form Input Validations]****************************************************************** */
//form input validations
const validation = {
    isValidEmail(email) {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return regex.test(email);
    },
    isValidPassword(password) {
        const regex = /^(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    },
    isMatchPassword(password, newPassword) {
        if (password !== newPassword) return false;
        else return true;
    }
};

// Sign-in form validation
document.getElementById('email').addEventListener('input', function () {
    const email = this.value;
    // Clear previous error
    const errorContainer = document.querySelector('.bg-red-50');
    if (errorContainer) {
        errorContainer.remove();
    }

    if (!validation.isValidEmail(email) && email.length > 0) {
        this.classList.remove('valid');
        this.classList.add('invalid');
    } else {
        emailInput = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

document.getElementById('password').addEventListener('input', function () {
    // Clear previous error
    const errorContainer = document.querySelector('.bg-red-50');
    if (errorContainer) {
        errorContainer.remove();
    }
});

// Sign-in form validation on submit
const signInForm = document.querySelector('form[action="/user/signIn"]');
if (signInForm) {
    signInForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Validate email
        if (!email || !validation.isValidEmail(email)) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid Email',
                text: 'Please enter a valid email address.',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Validate password is not empty
        if (!password) {
            Swal.fire({
                icon: 'error',
                title: 'Missing Password',
                text: 'Please enter your password.',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Disable submit button and show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Signing in...';

        try {
            const response = await fetch('/user/signIn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!data.success) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Sign In';
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message,
                    confirmButtonText: 'OK'
                });
                return;
            }

            // Redirect on success
            window.location.href = '/';

        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Sign In';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An unexpected error occurred. Please try again.',
                confirmButtonText: 'OK'
            });
        }
    });
}

document.getElementById('forgotEmail').addEventListener('input', function () {
    const email = this.value;
    const errorContainer = document.getElementById('emailError');

    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidEmail(email)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Please enter a valid email address.';
        errorContainer.classList.remove('hidden');
    } else {
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

document.getElementById('forgotNewPassword').addEventListener('input', function () {
    const password = this.value;
    const errorContainer = document.getElementById('newPasswordError');

    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidPassword(password)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Password must be at least 8 characters long and contain at least one number and one special character (@$!%*?&).';
        errorContainer.classList.remove('hidden');
    } else {
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

document.getElementById('forgotConfirmPassword').addEventListener('input', function () {
    const password = this.value;
    const newPasswordInput = document.getElementById('forgotNewPassword').value;
    const errorContainer = document.getElementById('confirmPasswordError');

    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isMatchPassword(password, newPasswordInput)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Passwords do not match.';
        errorContainer.classList.remove('hidden');
    } else {
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

/*****************************************[Forgot Password Modal]*****************************************************/
let forgotOtpId = null;

function fa(el) { try { return document.getElementById(el); } catch (e) { return null; } }
function faMsg(msg, type) {
    const el = fa('forgotFormMessage');
    if (!el) return console.warn('forgotFormMessage not found');
    el.textContent = msg;
    el.className = 'mt-4 p-3 rounded-lg text-sm ' + (type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-600');
    el.classList.remove('hidden');
}
function faHideMsg() { const el = fa('forgotFormMessage'); if (el) { el.classList.add('hidden'); el.textContent = ''; } }
function faLoading(formId, on) {
    try {
        const btn = document.querySelector('#' + formId + ' button[type="submit"]');
        if (!btn) return;
        btn.disabled = on;
        btn.innerHTML = on ? '<span class="inline-block animate-spin mr-2">&#9696;</span> Please wait...' : (btn.dataset.originalText || 'Submit');
    } catch (e) { console.error('faLoading error:', e); }
}

async function faFetch(url, body, formId) {
    let response;
    try {
        response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) {
        console.error('fetch error:', e);
        faLoading(formId, false);
        faMsg('An unexpected error occurred. Please try again.', 'error');
        return null;
    }

    const ct = response.headers.get('content-type');
    if (!ct || !ct.includes('application/json')) {
        const txt = await response.text().catch(function() { return ''; });
        console.error('bad content-type:', ct, 'body:', txt);
        faLoading(formId, false);
        faMsg('Server error. Please try again.', 'error');
        return null;
    }

    let data;
    try {
        data = await response.json();
    } catch (e) {
        console.error('json parse error:', e);
        faLoading(formId, false);
        faMsg('Server error. Please try again.', 'error');
        return null;
    }

    console.log('forgot API response:', JSON.stringify(data));

    if (!data || data.success !== true) {
        faLoading(formId, false);
        faMsg(data && data.message || 'Something went wrong.', 'error');
        return null;
    }

    return data;
}

function resetForgotSteps() {
    forgotOtpId = null;
    const s1 = fa('forgotStep1'); if (s1) s1.classList.remove('hidden');
    const s2 = fa('forgotStep2'); if (s2) s2.classList.add('hidden');
    const s3 = fa('forgotStep3'); if (s3) s3.classList.add('hidden');
    const sub = fa('forgotSubtitle'); if (sub) { sub.textContent = 'Enter your email to receive a reset code.'; sub.className = 'mt-1 text-sm text-gray-500'; }
    faHideMsg();
    document.querySelectorAll('#forgotModal input').forEach(function(inp) { inp.value = ''; inp.classList.remove('valid', 'invalid'); });
    document.querySelectorAll('#forgotModal button[type="submit"]').forEach(function(btn) { btn.disabled = false; btn.innerHTML = btn.dataset.originalText || 'Submit'; });
}

function showModal() { const m = fa('forgotModal'); if (m) { m.classList.remove('hidden'); resetForgotSteps(); } }
function closeModal() { const m = fa('forgotModal'); if (m) { m.classList.add('hidden'); resetForgotSteps(); } }

// Store original button texts
document.querySelectorAll('#forgotModal button[type="submit"]').forEach(function(btn) { btn.dataset.originalText = btn.innerHTML; });

// Step 1: Send OTP
document.getElementById('forgotStep1').addEventListener('submit', async function (event) {
    event.preventDefault();
    faHideMsg();

    const email = document.getElementById('forgotEmail').value;
    if (!validation.isValidEmail(email)) { faMsg('Please enter a valid email address.', 'error'); return; }

    faLoading('forgotStep1', true);
    const data = await faFetch('/user/forgotPassword/otpRequest', { email: email }, 'forgotStep1');
    if (!data) return;

    forgotOtpId = data.otpId;
    const s1 = fa('forgotStep1'); if (s1) s1.classList.add('hidden');
    const s2 = fa('forgotStep2'); if (s2) s2.classList.remove('hidden');
    const sub = fa('forgotSubtitle');
    if (sub) { sub.textContent = 'A 4-digit code was sent to your email.'; sub.className = 'mt-1 text-sm text-green-700 font-medium'; }
    faHideMsg();
});

// Step 2: Verify OTP
document.getElementById('forgotStep2').addEventListener('submit', async function (event) {
    event.preventDefault();
    faHideMsg();

    const otpValue = document.getElementById('forgotOtp').value;
    if (!otpValue || otpValue.length !== 4) { faMsg('Please enter a valid 4-digit OTP.', 'error'); return; }

    faLoading('forgotStep2', true);
    const data = await faFetch('/user/forgotPassword/otpVerify', { otpValue: otpValue, otpId: forgotOtpId }, 'forgotStep2');
    if (!data) return;

    const s2 = fa('forgotStep2'); if (s2) s2.classList.add('hidden');
    const s3 = fa('forgotStep3'); if (s3) s3.classList.remove('hidden');
    const sub = fa('forgotSubtitle');
    if (sub) { sub.textContent = 'OTP verified. Choose a new password.'; sub.className = 'mt-1 text-sm text-green-700 font-medium'; }
    faHideMsg();
});

// Step 3: Reset Password
document.getElementById('forgotStep3').addEventListener('submit', async function (event) {
    event.preventDefault();
    faHideMsg();

    const newPassword = document.getElementById('forgotNewPassword').value;
    const confirmPassword = document.getElementById('forgotConfirmPassword').value;
    const email = document.getElementById('forgotEmail').value;

    if (!validation.isValidPassword(newPassword)) { faMsg('Password must be at least 8 characters with a number and special character.', 'error'); return; }
    if (newPassword !== confirmPassword) { faMsg('Passwords do not match.', 'error'); return; }

    faLoading('forgotStep3', true);

    let response;
    try {
        response = await fetch('/user/forgotPassword/reset', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, newPassword: newPassword }) });
    } catch (e) {
        console.error('reset fetch error:', e);
        faLoading('forgotStep3', false);
        faMsg('An unexpected error occurred. Please try again.', 'error');
        return;
    }

    const ct = response.headers.get('content-type');
    if (!ct || !ct.includes('application/json')) {
        const txt = await response.text().catch(function() { return ''; });
        console.error('reset bad content-type:', ct, 'body:', txt);
        faLoading('forgotStep3', false);
        faMsg('Server error. Please try again.', 'error');
        return;
    }

    let data;
    try {
        data = await response.json();
    } catch (e) {
        console.error('reset json parse error:', e);
        faLoading('forgotStep3', false);
        faMsg('Server error. Please try again.', 'error');
        return;
    }

    console.log('reset API response:', JSON.stringify(data));

    if (!data || data.success !== true) {
        faLoading('forgotStep3', false);
        faMsg(data && data.message || 'Something went wrong.', 'error');
        return;
    }

    // Show success inline
    const sub = fa('forgotSubtitle'); if (sub) sub.textContent = '';
    const s3 = fa('forgotStep3'); if (s3) s3.innerHTML =
        '<div class="text-center py-6">' +
        '<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">' +
        '<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>' +
        '<h4 class="text-lg font-semibold text-gray-900">Password Reset Successful</h4>' +
        '<p class="mt-2 text-sm text-gray-500">' + (data.message || '') + '</p>' +
        '<button type="button" onclick="window.location.reload()" class="mt-6 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors btn-press">Back to Sign In</button>' +
        '</div>';
});

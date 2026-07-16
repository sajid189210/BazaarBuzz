let isValidEmail = false;
let isValidUsername = false;
let isValidPassword = false;
let isMatchPassword = false;
let otpTimerInterval = null;

const validation = {
    isValidEmail(email) {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return regex.test(email);
    },
    isValidUsername(username) {
        const regex = /^[A-Za-z]{3,}$/;
        return regex.test(username);
    },
    isValidPassword(password) {
        const regex = /^(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    },
    isMatchPassword(password, confirmPassword) {
        return password === confirmPassword;
    }
};

document.querySelector('input[name="email"]').addEventListener('input', function () {
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
        isValidEmail = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

document.querySelector('input[name="username"]').addEventListener('input', function () {
    const username = this.value;
    const errorContainer = document.getElementById('usernameError');
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidUsername(username)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Username must contain only letters and be at least 3 characters long.';
        errorContainer.classList.remove('hidden');
    } else {
        isValidUsername = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

document.querySelector('input[name="password"]').addEventListener('input', function () {
    const password = this.value;
    const errorContainer = document.getElementById('passwordError');
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidPassword(password)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Password must be at least 8 characters long and contain at least one number and one special character (@$!%*?&).';
        errorContainer.classList.remove('hidden');
    } else {
        isValidPassword = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }

    // Trigger confirm password validation if it has a value
    const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
    if (confirmPasswordInput.value) {
        const confirmErrorContainer = document.getElementById('confirmPasswordError');
        confirmErrorContainer.innerText = '';
        confirmErrorContainer.classList.add('hidden');

        if (!validation.isMatchPassword(password, confirmPasswordInput.value)) {
            confirmPasswordInput.classList.remove('valid');
            confirmPasswordInput.classList.add('invalid');
            confirmErrorContainer.innerText = 'Passwords do not match.';
            confirmErrorContainer.classList.remove('hidden');
            isMatchPassword = false;
        } else {
            confirmPasswordInput.classList.remove('invalid');
            confirmPasswordInput.classList.add('valid');
            isMatchPassword = true;
        }
    }
});

document.querySelector('input[name="confirmPassword"]').addEventListener('input', function () {
    const confirmPassword = this.value;
    const errorContainer = document.getElementById('confirmPasswordError');
    const password = document.getElementById('password').value;
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isMatchPassword(password, confirmPassword)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Passwords do not match.';
        errorContainer.classList.remove('hidden');
    } else {
        isMatchPassword = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

async function otpExpired(otpId) {
    try {
        const response = await fetch(`/user/otpExpiry?otpId=${otpId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (!data.success) {
            console.error('Error handling OTP expiry:', data.message);
        }

        // Show resend button for manual retry (auto-resend disabled)
        document.getElementById('resendOTP').classList.remove('hidden');

        // Notify user that OTP expired
        Swal.fire({
            icon: 'info',
            title: 'OTP Expired',
            text: 'The verification code has expired. Please click Resend OTP to get a new code.',
            confirmButtonText: 'OK',
            toast: true,
            position: 'top-end'
        });
    } catch (err) {
        console.error('Error caught while handling OTP expiry.', err);
        document.getElementById('resendOTP').classList.remove('hidden');
    }
}

function otpTimer(duration, otpId) {
    const timerContainer = document.getElementById('timer');
    let seconds = duration;

    // Clear any existing timer interval
    if (otpTimerInterval) {
        clearInterval(otpTimerInterval);
    }

    otpTimerInterval = setInterval(() => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        timerContainer.textContent = `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
        seconds--;

        if (seconds < 0) {
            clearInterval(otpTimerInterval);
            otpTimerInterval = null;
            document.getElementById('resendOTP').classList.remove('hidden');
            otpExpired(otpId);
        }
    }, 1000);
}

async function requestOTP(email) {
    try {
        const response = await fetch('/user/otpRequest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!data.success) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message,
                confirmButtonText: 'OK'
            });
            return false;
        }

        await Swal.fire({
            icon: 'success',
            title: 'OTP Sent',
            text: data.message,
            confirmButtonText: 'OK'
        });

        document.getElementById('OTPForm').reset();
        document.getElementById('otpModal').classList.remove('hidden');
        document.getElementById('modalOtpId').value = data.otpId;
        initializeOTPInputs();
        otpTimer(60, data.otpId);
        return true;
    } catch (err) {
        console.error('Error caught while requesting OTP.', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to send OTP. Please try again.',
            confirmButtonText: 'OK'
        });
        return false;
    }
}

document.getElementById('signUpForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.querySelector('input[name="username"]').value;
    const email = document.querySelector('input[name="email"]').value;
    const password = document.querySelector('input[name="password"]').value;
    const confirmPassword = document.querySelector('input[name="confirmPassword"]').value;

    if (!validation.isValidUsername(username)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Username',
            text: 'Username must contain only letters and be at least 3 characters long.',
            confirmButtonText: 'OK'
        });
        return;
    }
    if (!validation.isValidEmail(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Email',
            text: 'Please enter a valid email address.',
            confirmButtonText: 'OK'
        });
        return;
    }
    if (!validation.isValidPassword(password)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Password',
            text: 'Password must be at least 8 characters long and contain at least one number and one special character (@$!%*?&).',
            confirmButtonText: 'OK'
        });
        return;
    }
    if (!validation.isMatchPassword(password, confirmPassword)) {
        Swal.fire({
            icon: 'error',
            title: 'Password Mismatch',
            text: 'Passwords do not match.',
            confirmButtonText: 'OK'
        });
        return;
    }

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...';

    try {
        document.getElementById('OTPForm').reset();
        const requested = await requestOTP(email);
        if (!requested) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account';
            return;
        }
    } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account';
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred. Please try again.',
            confirmButtonText: 'OK'
        });
    }
});

function initializeOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    const otpInputElements = Array.from(otpInputs);
    const verifyBtn = document.getElementById('otpVerifyBtn');

    if (!otpInputElements.length) return;

    setTimeout(() => {
        otpInputElements[0].focus();
    }, 100);

    verifyBtn.disabled = true;
    verifyBtn.classList.add('opacity-50', 'cursor-not-allowed');
    verifyBtn.classList.remove('hover:bg-gray-800');

    function allFieldsFilled() {
        return otpInputElements.every(input => input.value.length === 1);
    }

    function toggleBtn() {
        if (allFieldsFilled()) {
            verifyBtn.disabled = false;
            verifyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            verifyBtn.classList.add('hover:bg-gray-800');
        } else {
            verifyBtn.disabled = true;
            verifyBtn.classList.add('opacity-50', 'cursor-not-allowed');
            verifyBtn.classList.remove('hover:bg-gray-800');
        }
    }

    function focusNext(index) {
        if (index < otpInputElements.length - 1) {
            otpInputElements[index + 1].focus();
            otpInputElements[index + 1].select();
        }
    }

    function focusPrev(index) {
        if (index > 0) {
            otpInputElements[index - 1].focus();
            otpInputElements[index - 1].select();
        }
    }

    otpInputElements.forEach((input, index) => {
        input.addEventListener('beforeinput', (e) => {
            if (e.inputType === 'insertText' && !/^\d$/.test(e.data)) {
                e.preventDefault();
            }
        });

        input.addEventListener('input', () => {
            input.value = input.value.replace(/[^0-9]/g, '').slice(0, 1);

            if (input.value) {
                input.classList.add('filled');
                input.classList.remove('border-gray-300');
                input.classList.add('border-rose-400', 'bg-rose-50');
            } else {
                input.classList.remove('filled', 'border-rose-400', 'bg-rose-50');
                input.classList.add('border-gray-300');
            }

            toggleBtn();

            if (input.value && index < otpInputElements.length - 1) {
                focusNext(index);
            }
        });

        input.addEventListener('keydown', (e) => {
            const isBackspace = e.key === 'Backspace';
            const isDelete = e.key === 'Delete';
            const isArrowLeft = e.key === 'ArrowLeft';
            const isArrowRight = e.key === 'ArrowRight';
            const isHome = e.key === 'Home';
            const isEnd = e.key === 'End';

            if (isBackspace || isDelete) {
                if (!input.value && index > 0) {
                    e.preventDefault();
                    focusPrev(index);
                    otpInputElements[index - 1].value = '';
                    otpInputElements[index - 1].classList.remove('filled', 'border-rose-400', 'bg-rose-50');
                    otpInputElements[index - 1].classList.add('border-gray-300');
                    toggleBtn();
                } else if (input.value) {
                    input.value = '';
                    input.classList.remove('filled', 'border-rose-400', 'bg-rose-50');
                    input.classList.add('border-gray-300');
                    toggleBtn();
                }
            }

            if (isArrowLeft) {
                e.preventDefault();
                focusPrev(index);
            }

            if (isArrowRight) {
                e.preventDefault();
                focusNext(index);
            }

            if (isHome) {
                e.preventDefault();
                otpInputElements[0].focus();
                otpInputElements[0].select();
            }

            if (isEnd) {
                e.preventDefault();
                otpInputElements[otpInputElements.length - 1].focus();
                otpInputElements[otpInputElements.length - 1].select();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);

            if (pasteData.length === 4) {
                pasteData.split('').forEach((digit, i) => {
                    if (i < otpInputElements.length) {
                        otpInputElements[i].value = digit;
                        otpInputElements[i].classList.add('filled');
                        otpInputElements[i].classList.remove('border-gray-300');
                        otpInputElements[i].classList.add('border-rose-400', 'bg-rose-50');
                    }
                });
                otpInputElements[3].focus();
                toggleBtn();
            }
        });

        input.addEventListener('focus', () => {
            input.classList.add('ring-2', 'ring-rose-400/30');
        });

        input.addEventListener('blur', () => {
            input.classList.remove('ring-2', 'ring-rose-400/30');
        });
    });

    toggleBtn();
}

async function sendUserDataToServer() {
    const username = document.querySelector('input[name="username"]').value;
    const email = document.querySelector('input[name="email"]').value;
    const password = document.querySelector('input[name="password"]').value;

    try {
        const response = await fetch('/user/signUp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, confirmPassword: password })
        });

        const userData = await response.json();

        if (!userData.success) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: userData.message || 'Registration failed. Please try again.',
                confirmButtonText: 'OK'
            });
            return;
        }

        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: 'Account created successfully!',
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.href = userData.redirectUrl || '/';
        });
    } catch (err) {
        console.error('Error caught while sendUserDataToServer.', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred. Please try again.',
            confirmButtonText: 'OK'
        });
    }
}

document.getElementById('OTPForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const otpInputs = document.querySelectorAll('.otp-input');
    const otpId = document.getElementById('modalOtpId').value;
    const email = document.getElementById('email').value;

    const otpValue = parseInt(Array.from(otpInputs).map(input => input.value).join(''));

    const submitBtn = document.querySelector('#signUpForm button[type="submit"]');

    try {
        const response = await fetch('/user/otpVerify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otpValue, otpId, email })
        });

        const data = await response.json();

        if (!data.success) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message,
                confirmButtonText: 'OK'
            });
            // Reset main button so user can retry
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account';
            return;
        }

        if (!data.otp.isVerified) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Sorry, please try again. Error processing OTP.',
                confirmButtonText: 'OK'
            });
            // Reset main button so user can retry
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Account';
            return;
        }

        sendUserDataToServer();
    } catch (err) {
        console.error('Error caught while verifying OTP.', err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred. Please try again.',
            confirmButtonText: 'OK'
        });
        // Reset main button on error
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account';
    }
});

document.getElementById('resendOTP').addEventListener('click', async function () {
    const email = document.getElementById('email').value;
    const requested = await requestOTP(email);
    if (requested) {
        document.getElementById('OTPForm').reset();
        document.getElementById('resendOTP').classList.add('hidden');
    }
});

function closeModal() {
    // Clear the timer when modal is closed to prevent background auto-resend
    if (otpTimerInterval) {
        clearInterval(otpTimerInterval);
        otpTimerInterval = null;
    }
    document.getElementById('otpModal').classList.add('hidden');
}

/* ************************************Handles Sign In Validation**************************************************** */
let isValidEmail = false;
let isValidUsername = false;
let isValidPassword = false;
let isMatchPassword = false;

//form input validations
const validation = {
    isValidEmail(email) {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return regex.test(email);
    },
    isValidUsername(username) {
        const regex = /^[a-zA-Z0-9_-]{3,20}$/;
        return regex.test(username);
    },
    isValidPassword(password) {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d_@$!%*?&]{8,12}$/;
        return regex.test(password);
    },
    isMatchPassword(password, confirmPassword) {
        if (password !== confirmPassword) return false;
        else return true;
    }
};


// email validation
document.querySelector('input[name="email"]').addEventListener('input', function () {
    const email = this.value;
    const errorContainer = document.getElementById('emailError');


    // Clear previous error message
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidEmail(email)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Invalid Email';
        errorContainer.classList.remove('hidden');
    } else {
        isValidEmail = true;
        this.classList.remove('invalid');
        this.classList.add('valid');

    }

});

// username validation
document.querySelector('input[name="username"]').addEventListener('input', function () {
    const username = this.value;
    const errorContainer = document.getElementById('usernameError');


    // Clear previous error message
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidUsername(username)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Username must be between 3 and 20 characters';
        errorContainer.classList.remove('hidden');
    } else {
        isValidUsername = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }

});

//password validation
document.querySelector('input[name="password"]').addEventListener('input', function () {
    const password = this.value;
    const errorContainer = document.getElementById('passwordError');


    // Clear previous error message
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidPassword(password)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Password must be between 8 and 12 characters';
        errorContainer.classList.remove('hidden');
    } else {
        isValidPassword = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }

});

// confirm password validation
document.querySelector('input[name="confirmPassword"]').addEventListener('input', function () {
    const confirmPassword = this.value;
    const errorContainer = document.getElementById('confirmPasswordError');
    const password = document.getElementById('password').value;

    // Clear previous error message
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isMatchPassword(password, confirmPassword)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Passwords do not match';
        errorContainer.classList.remove('hidden');
    } else {
        isMatchPassword = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }

});
/***********************************Handles OTP Request/Verify/Resend******************************************************** */

//*handle OTP expiry
async function otpExpired(otpId) {
    try {
        const response = await fetch(`/user/otpExpiry?otpId=${otpId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        if (!data.success) {
            alert('Error handling OTP expiry');
            return;
        }

        alert(data.message);

    } catch (err) {
        console.error('Error caught while handling OTP expiry.', err);
    }
}

//* setting timer for OTP.
function otpTimer(duration, otpId) {
    const timerContainer = document.getElementById('timer');
    let seconds = duration;

    const interval = setInterval(() => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        timerContainer.textContent = `${minutes}:${secs < 10 ? '0' : ''}${secs}`
        seconds--;

        if (seconds < 0) {
            clearInterval(interval);
            document.getElementById('resendOTP').classList.remove('hidden');
            otpExpired(otpId);
        }
    }, 1000);
}

//* requesting OTP.
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
                title: ' Email already taken',
                text: 'The email you provided is already taken. Please use a different one.',
                icon: 'warning',
                confirmButtonText: 'Ok'
            });
            return false;
        }

        await Swal.fire({
            title: 'OTP send',
            text: data.message,
            icon: 'success',
            confirmButtonText: 'Ok'
        });
        
        document.getElementById('otpModal').classList.remove('hidden');
        document.getElementById('modalOtpId').value = data.otpId;
        otpTimer(60, data.otpId);
    } catch (err) {
        console.error('Error caught while requesting OTP.', err);
    }
}

//*event listener for form submission and opens the modal.
document.getElementById('signUpForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.querySelector('input[name="username"]').value;
    const email = document.querySelector('input[name="email"]').value;
    const password = document.querySelector('input[name="password"]').value;
    const confirmPassword = document.querySelector('input[name="confirmPassword"]').value;

    if (!isValidEmail || !isValidUsername || !isValidPassword || !isMatchPassword) {
        alert('Type Valid inputs!');
        return;
    }

    document.getElementById('OTPForm').reset();
    const requested = requestOTP(email);

    if (!requested) {
        // await Swal.fire({
        //     title: 'Error',
        //     text: 'failed to request OTP. Please try again.',

        // });
        return;
    }

    // const user = await fetch('/user/signUp', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ username, email, password })
    // });

    // const userData = await user.json();

    // if (!userData.success) window.location.href = userData.redirectUrl;

});

// listens for input events in OTP form.
document.addEventListener('DOMContentLoaded', function () {

    const otpInputs = document.querySelectorAll('#OTPForm input[name="otp"]');

    const otpInputElements = Array.from(otpInputs);

    //function to check all fields are filled.
    function allFieldsFilled() {
        return otpInputElements.every(input => input.value !== '');
    }

    // function to disable button.
    function toggleBtn() {
        const button = document.getElementById('otpVerifyBtn');
        button.disabled = !allFieldsFilled();
        button.classList.remove('hover:bg-[#556B2F]');
    }

    //initial state.
    toggleBtn();

    //listens for input changes.
    otpInputElements.forEach(input => {
        input.addEventListener('input', toggleBtn);
    });
});

//* Called from OTPFrom submit event listener
async function sendUserDataToServer() {
    const username = document.querySelector('input[name="username"]').value;
    const email = document.querySelector('input[name="email"]').value;
    const password = document.querySelector('input[name="password"]').value;

    try {
        const response = await fetch('/user/signUp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const userData = await response.json();

        if (!userData.success) {
            window.location.href = userData.redirectUrl;
            return;
        }

        window.location.href = userData.redirectUrl;

    } catch (err) {
        console.error('Error caught while sendUserDataToServer.', err);
    }

}

//*verify and validate otp. OTPFrom  submission.
document.getElementById('OTPForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const otpInputs = document.querySelectorAll('#OTPForm input[name="otp"]');
    const otpId = document.getElementById('modalOtpId').value;

    const otpValue = parseInt(Array.from(otpInputs).map(input => input.value).join(''));

    try {
        const response = await fetch('/user/otpVerify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otpValue, otpId })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        if (!data.otp.isVerified) {
            alert('Sorry, Please try again. Error processing OTP');
            window.location.reload();
        }

        sendUserDataToServer()
        // window.location.href = '/';

    } catch (err) {
        console.error('Error caught while verifying OTP.', err);
    }
});

//* resend otp
document.getElementById('resendOTP').addEventListener('click', async function () {

    const email = document.getElementById('email').value;
    requestOTP(email);
    document.getElementById('OTPForm').reset();
    document.getElementById('resendOTP').classList.add('hidden');

});

//* closes the modal
function closeModal(modalId) {
    document.getElementById('otpModal').classList.add('hidden');
    window.location.reload();
}
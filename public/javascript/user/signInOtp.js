//?stores the email.
let email;

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

function isValidEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

//*handle OTP expiry
async function otpExpired() {
    try {
        const response = await fetch('/user/otpExpiry', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

    } catch (err) {
        console.error('Error caught while handling OTP expiry.', err);
    }
}

///setting timer for OTP.
function otpTimer(duration) {
    const timerContainer = document.getElementById('timer');
    let seconds = duration;

    const interval = setInterval(() => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        timerContainer.textContent = `${minutes}:${secs < 10 ? '0' : ''}${secs}`
        seconds--;

        if (seconds < 0) {
            clearInterval(interval);
            resendOTP.classList.remove('hidden');
            otpExpired();
        }
    }, 1000);
}

//* Event listener for OTP request.
document.getElementById('modalForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    email = document.getElementById('modalEmail').value;
    const form = document.getElementById('modalForm')

    if (!isValidEmail(email)) {
        alert('email is not valid');
        return;
    }

    try {
        const response = await fetch('/user/otpRequest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        alert(data.message);
        closeModal('modal');
        form.reset()
        showModal('otpModal');
        otpTimer(60);
    } catch (err) {
        console.error('Error caught while requesting OTP.', err);
    }
});

//*verify and validate otp.
document.addEventListener('DOMContentLoaded', function () {
    const otpInput = document.querySelectorAll('#OTPForm input[name="otp"]');
    const resendOTP = document.getElementById('resendOTP');

    //function to check all fields are filled.
    function allFieldsFilled() {
        return Array.from(otpInput).every(input => input.value !== '');
    }

    //function to disable button. 
    function toggleBtn() {
        const button = document.getElementById('otpVerifyBtn');
        button.disabled = !allFieldsFilled();
        button.classList.remove('hover:bg-[#556B2F]');
    }

    //initial state.
    toggleBtn();

    //listens for input changes.
    otpInput.forEach(input => {
        input.addEventListener('input', toggleBtn);
    });


    //*send verify request/form submission
    document.getElementById('OTPForm').addEventListener('submit', async function (event) {
        event.preventDefault();

        const otpValue = parseInt(Array.from(otpInput).map(input => input.value).join(''));

        try {
            const response = await fetch('/user/otpVerify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otpValue })
            });

            const data = await response.json();

            if (!data.success) {
                alert(data.message);
                return;
            }

            email = null;
            window.location.href = '/user/homepage';
        } catch (err) {
            console.error('Error caught while verifying OTP.', err);
        }

    });
});

document.getElementById('resendOTP').addEventListener('click', async function () {
    const form = document.getElementById('OTPForm');
    try {
        const response = await fetch('/user/otpRequest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        alert(data.message);
        form.reset();
        otpTimer(60);

    } catch (err) {
        console.error('Error caught while resending OTP.', err);

    }
})


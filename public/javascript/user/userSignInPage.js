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

    // Clear previous error message
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidEmail(email)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Please enter a valid email address.';
        errorContainer.classList.remove('hidden');
    } else {
        emailInput = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

document.getElementById('newPassword').addEventListener('input', function () {
    const password = this.value;
    const errorContainer = document.getElementById('newPasswordError');

    // Clear previous error message
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidPassword(password)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Password must be at least 8 characters long and contain at least one number and one special character (@$!%*?&).';
        errorContainer.classList.remove('hidden');
    } else {
        newPassword = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

document.getElementById('confirmPassword').addEventListener('input', function () {
    const password = this.value;
    const newPasswordInput = document.getElementById('newPassword').value;
    const errorContainer = document.getElementById('confirmPasswordError');

    // Clear previous error message
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isMatchPassword(password, newPasswordInput)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Passwords do not match.';
        errorContainer.classList.remove('hidden');
    } else {
        confirmPassword = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
    }
});

// Add email validation for sign-in form
document.getElementById('email').addEventListener('input', function () {
    const email = this.value;
    if (email && !validation.isValidEmail(email)) {
        this.classList.add('invalid');
        this.classList.remove('valid');
    } else if (email && validation.isValidEmail(email)) {
        this.classList.add('valid');
        this.classList.remove('invalid');
    } else {
        this.classList.remove('valid', 'invalid');
    }
});

/*****************************************[From Submission]*****************************************************/
function showModal() {
    document.getElementById('forgotModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('forgotModal').classList.add('hidden');
}

document.getElementById('forgotForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('forgotEmail').value;
    const newInput = document.getElementById('newPassword').value;
    try {

        if (!newPassword || !confirmPassword || !emailInput) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'All input fields must be filled.',
                confirmButtonText: 'OK'
            });
            return;
        }

        const response = await fetch('/user/updatePassword', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newInput })
        });


        const data = await response.json();
        console.log(data)

        if (!data.success) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message,
                confirmButtonText: 'OK'
            });
            return;
        }

        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: data.message,
            confirmButtonText: 'OK'
        }).then(() => {
            window.location.reload();
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An unexpected error occurred. Please try again.',
            confirmButtonText: 'OK'
        });
    }
});

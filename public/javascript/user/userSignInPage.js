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
        const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d_@$!%*?&]{8,12}$/;
        return regex.test(password);
    },
    isMatchPassword(password, newPassword) {
        if (password !== newPassword) return false;
        else return true;
    }
};

document.getElementById('forgotEmail').addEventListener('input', function () {
    const email = this.value;
    const errorContainer = document.getElementById('emailError');

    // Clear previous error message
    errorContainer.innerText = '';
    errorContainer.classList.add('hidden');

    if (!validation.isValidEmail(email)) {
        this.classList.remove('valid');
        this.classList.add('invalid');
        errorContainer.innerText = 'Invalid email';
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
        errorContainer.innerText = 'Password must be between 8 and 12 characters';
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
        errorContainer.innerText = 'Passwords do not match';
        errorContainer.classList.remove('hidden');
    } else {
        confirmPassword = true;
        this.classList.remove('invalid');
        this.classList.add('valid');
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
            alert('All input fields must be filled.');
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
            alert(data.message);
            return;
        }

        alert(data.message);
        window.location.reload();
    } catch (err) {

    }
});
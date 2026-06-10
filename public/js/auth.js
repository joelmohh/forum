const togglePasswordButton = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const signupForm = document.getElementById('signup_form');
const nextBtn = document.getElementById('next_step_signup');
const loginForm = document.getElementById('login_form');
const loginEmailInput = loginForm ? loginForm.querySelector('[name="email"]') : null;
const loginPasswordInput = loginForm ? loginForm.querySelector('[name="password"]') : null;
const loginMessages = {
    email: document.getElementById('login-email-message'),
    password: document.getElementById('login-password-message')
};

if (togglePasswordButton && passwordInput) {
    togglePasswordButton.addEventListener('click', () => {
        const icon = document.querySelector('#togglePassword i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            if (icon) {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        } else {
            passwordInput.type = 'password';
            if (icon) {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    });
}


document.querySelectorAll('.input-group.otp input').forEach((input, index, inputs) => {
    input.addEventListener('input', () => {
        input.value = input.value.slice(0, 1);
        if (input.value && inputs[index + 1]) {
            inputs[index + 1].focus();
        }
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && inputs[index - 1]) {
            inputs[index - 1].focus();
        }
    });
});

const messageElements = {
    password: document.getElementById('password-message'),
    confirmPassword: document.getElementById('confirmPassword-message'),
    email: document.getElementById('email-message'),
    username: document.getElementById('username-message')
};

const strengthBar = document.getElementById('password-strength-fill');
const strengthContainer = document.getElementById('password-strength-container');
const passwordRules = {
    length: document.getElementById('rule-length'),
    lowercase: document.getElementById('rule-lowercase'),
    uppercase: document.getElementById('rule-uppercase'),
    number: document.getElementById('rule-number'),
    special: document.getElementById('rule-special')
};

const inputs = document.querySelectorAll('.form-control');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        if (input.name === 'email' && loginForm && input.closest('#login_form')) {
            updateLoginFieldState(loginEmailInput, loginMessages.email, isValidEmail(input.value), 'Email valid.', 'Please enter a valid email address.');
            return;
        }

        if (input.name === 'password' && loginForm && input.closest('#login_form')) {
            updateLoginFieldState(loginPasswordInput, loginMessages.password, Boolean(input.value.trim()), 'Password added.', 'Password is required.');
            return;
        }

        if (input.name === 'email') {
            showSuccess(input, messageElements.email, isValidEmail(input.value), 'Email valid.');
        }

        if (input.name === 'username') {
            showSuccess(input, messageElements.username, isValidUsername(input.value), 'Username valid.');
        }

        if (input.name === 'password') {
            updatePasswordStrength(input.value);
            togglePasswordStrength(input.value, input === document.activeElement);
            showSuccess(input, messageElements.password, isPasswordValid(input.value), 'Password valid.');
            validatePasswordMatch();
        }

        if (input.name === 'confirmPassword') {
            validatePasswordMatch();
        }
    });
});

if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        const isLoginValid = validateLoginForm();

        if (!isLoginValid) {
            event.preventDefault();
        }
    });
}

if (passwordInput && strengthContainer) {
    passwordInput.addEventListener('focus', () => {
        togglePasswordStrength(passwordInput.value, true);
    });

    passwordInput.addEventListener('blur', () => {
        togglePasswordStrength(passwordInput.value, false);
    });
}

let currentStep = 1;

const steps = [
    document.getElementById('step_1'),
    document.getElementById('step_2'),
    document.getElementById('step_3')
];

const progressSteps = document.querySelectorAll('.progress-steps .step');

if (nextBtn && signupForm) {
    updateStepProgress();

    nextBtn.addEventListener('click', async () => {
        const valid = await validateStep(currentStep);
        if (!valid) return;

        if (currentStep < 3) {
            steps[currentStep - 1].classList.add('d-none');
            currentStep++;
            steps[currentStep - 1].classList.remove('d-none');
            updateStepProgress();

            if (currentStep === 3) {
                nextBtn.innerHTML = 'Create Account';
            }

            return;
        }

        signupForm.submit();
    });
}

function updateStepProgress() {

    progressSteps.forEach((step, index) => {

        step.classList.remove('active', 'complete');

        if (index + 1 < currentStep) {
            step.classList.add('complete');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
        }

    });

}
async function validateStep(step) {

    if (step === 1) {
        let isValid = true;
        const username = document.querySelector('[name="username"]');
        const email = document.querySelector('[name="email"]');
        const password = document.querySelector('[name="password"]');
        const confirmPassword = document.querySelector('[name="confirmPassword"]');

        const emailMessage = messageElements.email;
        const usernameMessage = messageElements.username;
        const passwordMessage = messageElements.password;
        const confirmPasswordMessage = messageElements.confirmPassword;

        const errorMessages = {
            username: {
                empty: 'Username is required.',
                length: 'Username must be between 3 and 30 characters.',
                taken: 'Username is already taken.'
            },
            email: {
                empty: 'Email is required.',
                invalid: 'Please enter a valid email address.',
                taken: 'Email is already registered.'
            },
            password: {
                empty: 'Password is required.',
                length: 'Password must be at least 8 characters.',
                weak: 'You must follow all the password rules.'
            },
            confirmPassword: {
                empty: 'Please confirm your password.',
                mismatch: 'Passwords do not match.'
            }
        }

        if (!isValidUsername(username.value)) {
            showError(username, usernameMessage, errorMessages.username.length);
            isValid = false;
        } else {
            showSuccess(username, usernameMessage, true, 'Username valid.');
        }

        if (!isValidEmail(email.value)) {
            showError(email, emailMessage, email.value ? errorMessages.email.invalid : errorMessages.email.empty);
            isValid = false;
        } else {
            showSuccess(email, emailMessage, true, 'Email valid.');
        }

        if (!password.value) {
            showError(password, passwordMessage, errorMessages.password.empty);
            isValid = false;
        } else if (!isPasswordValid(password.value)) {
            showError(password, passwordMessage, errorMessages.password.weak);
            isValid = false;
        } else {
            showSuccess(password, passwordMessage, true, 'Password valid.');
        }

        if (!confirmPassword.value) {
            showError(confirmPassword, confirmPasswordMessage, errorMessages.confirmPassword.empty);
            isValid = false;
        } else if (confirmPassword.value !== password.value) {
            showError(confirmPassword, confirmPasswordMessage, errorMessages.confirmPassword.mismatch);
            isValid = false;
        } else {
            showSuccess(confirmPassword, confirmPasswordMessage, true, 'Passwords match.');
        }

        return isValid;
    }

    if (step === 2) {
        return true;
    }

    if (step === 3) {
        return true;
    }

    return false;
}

function isPasswordValid(password) {
    return password.length >= 8
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /[0-9]/.test(password)
        && /[^A-Za-z0-9]/.test(password);
}

function updatePasswordStrength(password) {
    if (!strengthBar) {
        return;
    }

    const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    const widths = ['0%', '20%', '40%', '60%', '80%', '100%'];
    const colors = ['#dc3545', '#dc3545', '#fd7e14', '#ffc107', '#198754', '#198754'];

    strengthBar.style.width = widths[score];
    strengthBar.style.backgroundColor = colors[score];

    Object.entries(passwordRules).forEach(([ruleName, element]) => {
        if (!element) {
            return;
        }

        element.classList.toggle('valid', Boolean(checks[ruleName]));
    });
}

function togglePasswordStrength(password, isFocused) {
    if (!strengthContainer) {
        return;
    }

    const hasValue = Boolean(password && password.length);
    const isComplete = isPasswordValid(password || '');

    if (isComplete || !hasValue) {
        strengthContainer.classList.add('d-none');
        return;
    }

    if (isFocused || hasValue) {
        strengthContainer.classList.remove('d-none');
    }
}

function validatePasswordMatch() {
    if (!confirmPasswordInput || !passwordInput) {
        return;
    }

    const confirmPasswordMessage = messageElements.confirmPassword;

    if (!confirmPasswordInput.value || !passwordInput.value) {
        clearValidation(confirmPasswordInput, confirmPasswordMessage);
        return;
    }

    if (confirmPasswordInput.value !== passwordInput.value) {
        showError(confirmPasswordInput, confirmPasswordMessage, 'Passwords do not match.');
        return;
    }

    showSuccess(confirmPasswordInput, confirmPasswordMessage, true, 'Passwords match.');
}

function isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
}

function isValidUsername(username) {
    return Boolean(username) && username.length >= 3 && username.length <= 30;
}

function showSuccess(input, messageContainer, isValid, successMessage) {
    if (!input || !messageContainer) {
        return;
    }

    if (!isValid) {
        clearValidation(input, messageContainer);
        return;
    }

    input.classList.remove('error');
    input.classList.add('success');
    messageContainer.innerHTML = `<span class="validation-message success">${successMessage}</span>`;
}

function showError(input, messageContainer, errorMessage) {
    if (!input || !messageContainer) {
        return;
    }

    input.classList.remove('success');
    input.classList.add('error');
    messageContainer.innerHTML = `<span class="validation-message error">${errorMessage}</span>`;
}

function clearValidation(input, messageContainer) {
    if (!input || !messageContainer) {
        return;
    }

    input.classList.remove('error');
    input.classList.remove('success');
    messageContainer.innerHTML = '';
}

function validateLoginForm() {
    if (!loginForm) {
        return true;
    }

    let isValid = true;

    if (!isValidEmail(loginEmailInput ? loginEmailInput.value : '')) {
        updateLoginFieldState(loginEmailInput, loginMessages.email, false, 'Email valid.', 'Please enter a valid email address.');
        isValid = false;
    } else {
        updateLoginFieldState(loginEmailInput, loginMessages.email, true, 'Email valid.', 'Please enter a valid email address.');
    }

    if (!loginPasswordInput || !loginPasswordInput.value.trim()) {
        updateLoginFieldState(loginPasswordInput, loginMessages.password, false, 'Password added.', 'Password is required.');
        isValid = false;
    } else {
        updateLoginFieldState(loginPasswordInput, loginMessages.password, true, 'Password added.', 'Password is required.');
    }

    return isValid;
}

function updateLoginFieldState(input, messageContainer, isValid, successMessage, errorMessage) {
    if (!input || !messageContainer) {
        return;
    }

    if (isValid) {
        input.classList.remove('error');
        input.classList.add('success');
        messageContainer.innerHTML = `<span class="validation-message success">${successMessage}</span>`;
        return;
    }

    input.classList.remove('success');
    input.classList.add('error');
    messageContainer.innerHTML = `<span class="validation-message error">${errorMessage}</span>`;
}
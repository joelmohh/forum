const togglePasswordButton = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const signupForm = document.getElementById('signup_form');
const nextBtn = document.getElementById('next_step_signup');
const loginForm = document.getElementById('login_form');
const loginBtn = document.getElementById('login_btn');
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
    input.addEventListener('input', async () => {
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
            const username = input.value.trim();

            if (!isValidUsernameFormat(username)) {
                clearValidation(input, messageElements.username);
                return;
            }

            const available = await checkUsernameAvailability(username);

            if (available) {
                showSuccess(input, messageElements.username, true, 'Username available.');
            } else {
                showError(input, messageElements.username, 'Username is already taken.');
            }
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

        if (currentStep === 2) {

            const email = document.querySelector('[name="email"]').value;
            const username = document.querySelector('[name="username"]').value;
            const password = document.querySelector('[name="password"]').value;
            const profilePictureInput = document.querySelector('[name="profilePicture"]');
            const displayName = document.querySelector('[name="displayName"]').value;
            const bio = document.querySelector('[name="bio"]').value;

            const formData = new FormData();

            formData.append('email', email);
            formData.append('username', username);
            formData.append('password', password);
            formData.append('displayName', displayName);
            formData.append('bio', bio);

            if (profilePictureInput.files[0]) {
                formData.append('profilePicture', profilePictureInput.files[0]);
            }

            nextBtn.disabled = true;
            nextBtn.innerText = 'Sending OTP...';

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    credentials: "include",
                    body: formData
                });

                const data = await response.json();

                if (!data.success) {
                    alert(data.message || 'Failed to send OTP');
                    nextBtn.disabled = false;
                    nextBtn.innerText = 'Next Step';
                    return;
                }

                steps[currentStep - 1].classList.add('d-none');
                currentStep++;
                steps[currentStep - 1].classList.remove('d-none');
                updateStepProgress();

            } catch (err) {
                console.error(err);
                alert('Error sending OTP');
            }

            nextBtn.disabled = false;
            nextBtn.innerText = 'Next Step';

            return;
        }

        if (currentStep < 3) {
            steps[currentStep - 1].classList.add('d-none');
            currentStep++;
            steps[currentStep - 1].classList.remove('d-none');
            updateStepProgress();
            return;
        }
        if (currentStep === 3) {
            const valid = await validateStep(currentStep);
            if (valid) {
                window.location.href = '/';
            }
            else {
                return
            }
        }

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
                weak: 'You must follow all the password rules.'
            },
            confirmPassword: {
                empty: 'Please confirm your password.',
                mismatch: 'Passwords do not match.'
            }
        };

        if (!isValidUsernameFormat(username.value)) {
            showError(username, usernameMessage, errorMessages.username.length);
            isValid = false;
        }

        if (!isValidEmail(email.value)) {
            showError(email, emailMessage, email.value ? errorMessages.email.invalid : errorMessages.email.empty);
            isValid = false;
        }

        if (!password.value) {
            showError(password, passwordMessage, errorMessages.password.empty);
            isValid = false;
        } else if (!isPasswordValid(password.value)) {
            showError(password, passwordMessage, errorMessages.password.weak);
            isValid = false;
        }

        if (!confirmPassword.value) {
            showError(confirmPassword, confirmPasswordMessage, errorMessages.confirmPassword.empty);
            isValid = false;
        } else if (confirmPassword.value !== password.value) {
            showError(confirmPassword, confirmPasswordMessage, errorMessages.confirmPassword.mismatch);
            isValid = false;
        }

        if (!isValid) {
            return false;
        }

        const response = await fetch('/api/auth/check-availability', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: "include",
            body: JSON.stringify({
                username: username.value,
                email: email.value
            })
        });

        const data = await response.json();

        if (!data.usernameAvailable) {
            showError(username, usernameMessage, errorMessages.username.taken);
            isValid = false;
        } else {
            showSuccess(username, usernameMessage, true, 'Username valid.');
        }

        if (!data.emailAvailable) {
            showError(email, emailMessage, errorMessages.email.taken);
            isValid = false;
        } else {
            showSuccess(email, emailMessage, true, 'Email valid.');
        }

        if (isPasswordValid(password.value)) {
            showSuccess(password, passwordMessage, true, 'Password valid.');
        }

        if (confirmPassword.value === password.value) {
            showSuccess(confirmPassword, confirmPasswordMessage, true, 'Passwords match.');
        }

        return isValid;
    }

    if (step === 2) {
        return true;
    }

    if (step === 3) {
        const otpInputs = document.querySelectorAll('.input-group.otp input');

        const otp = Array.from(otpInputs)
            .map(input => input.value.trim())
            .join('');

        const otpMessage = document.getElementById('otp-message');

        if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            showOtpError('Please enter a valid 6-digit code.');
            return false;
        }

        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: "include",
                body: JSON.stringify({
                    email: document.querySelector('[name="email"]').value,
                    code: otp
                })
            });

            const data = await response.json();

            if (!response.ok || !data.valid) {
                showOtpError(data.message || 'Invalid or expired OTP code.');
                return false;
            }

            window.location.href = "/";

            return true;

        } catch (err) {
            console.error(err);
            showOtpError("Something went wrong.");
            return false;
        }
    }

    return false;
}
function showOtpError(message) {
    let container = document.getElementById('otp-message');

    if (!container) {
        container = document.createElement('div');
        container.id = 'otp-message';
        container.className = 'validation-messages error mt-2';

        document.querySelector('.input-group.otp').after(container);
    }

    container.innerHTML = `<span class="validation-message error">${message}</span>`;
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

function isValidUsernameFormat(username) {
    return Boolean(username) && username.length >= 3 && username.length <= 30;
}
async function checkUsernameAvailability(username) {
    try {
        const response = await fetch(
            '/api/auth/check-availability?username=true',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: "include",
                body: JSON.stringify({ username })
            }
        );

        const data = await response.json();

        return data.usernameAvailable === true;
    } catch (err) {
        console.error('Error checking username:', err);
        return false;
    }
}

function showSuccess(input, messageContainer, isValid, successMessage) {
    if (!messageContainer) return;

    if (input) {
        input.classList.remove('error');
        input.classList.add('success');
    }

    messageContainer.innerHTML = `
        <span class="validation-message success">${successMessage}</span>
    `;
}

function showError(input, messageContainer, errorMessage) {
    if (!messageContainer) return;

    if (input) {
        input.classList.remove('success');
        input.classList.add('error');
    }

    messageContainer.innerHTML = `
        <span class="validation-message error">${errorMessage}</span>
    `;
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
if (loginBtn) {
    loginBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const isValid = validateLoginForm();
        if (!isValid) return;

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email: loginEmailInput.value,
                    password: loginPasswordInput.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                updateLoginFieldState(
                    loginPasswordInput,
                    loginMessages.password,
                    false,
                    "",
                    data.message || "Invalid credentials"
                );
                return;
            }

            window.location.href = "/";

        } catch (err) {
            console.error("Login error:", err);
        }
    });
}
const resendOtpBtn = document.getElementById("resend_otp");

if (resendOtpBtn) {
    let cooldown = 30;
    let timer;

    const startCooldown = () => {
        resendOtpBtn.classList.add("disabled");

        timer = setInterval(() => {
            resendOtpBtn.innerText = `Resend OTP (${cooldown}s)`;

            cooldown--;

            if (cooldown < 0) {
                clearInterval(timer);
                resendOtpBtn.classList.remove("disabled");
                resendOtpBtn.innerText = "Resend OTP";
                cooldown = 30;
            }
        }, 1000);
    };

    resendOtpBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const email = document.querySelector('[name="email"]').value;
        const otpMessage = document.getElementById("otp-message");

        try {
            const response = await fetch("/api/auth/resend-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (!response.ok) {
                showError(null, otpMessage, data.message || "Failed to resend OTP");
                return;
            }

            showSuccess(null, otpMessage, true, "OTP resent successfully.");

            startCooldown();

        } catch (err) {
            console.error(err);

            showError(null, document.getElementById("otp-message"), "Error resending OTP");
        }
    });
}
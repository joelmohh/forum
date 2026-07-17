const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const profilePictureInput = document.getElementById("profilePicture");
const bannerInput = document.getElementById("banner");
const bannerColorInput = document.getElementById("bannerColor");

const bannerPreview = document.getElementById("bannerPreview");
const bannerPreviewImage = document.getElementById("bannerPreviewImage");
const bannerFileName = document.getElementById("bannerFileName");

const removeProfilePictureBtn = document.getElementById("removeProfilePicture");
const removeBannerBtn = document.getElementById("removeBanner");

const oldPasswordInput = document.getElementById("oldPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("password");

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

let removeProfilePictureFlag = false;
let removeBannerFlag = false;
let lastBannerObjectURL = null;

function setValidation(input, valid, message) {
    const messageContainer = document.getElementById(`${input.id}-message`);

    input.classList.remove("is-valid", "is-invalid");

    messageContainer.innerHTML = valid
        ? `<div class="valid-feedback d-block">${message}</div>`
        : `<div class="invalid-feedback d-block">${message}</div>`;

    input.classList.add(valid ? "is-valid" : "is-invalid");
}

function clearValidation(input) {
    const messageContainer = document.getElementById(`${input.id}-message`);

    input.classList.remove("is-valid", "is-invalid");
    messageContainer.innerHTML = "";
}

function validateImage(input) {
    const file = input.files[0];

    if (!file) {
        clearValidation(input);
        return true;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setValidation(input, false, "Invalid format.");
        input.value = "";
        return false;
    }

    if (file.size > MAX_IMAGE_SIZE) {
        setValidation(input, false, "Image must be at most 5MB.");
        input.value = "";
        return false;
    }

    setValidation(input, true, "Valid image.");
    return true;
}

function validatePassword() {
    const oldPass = oldPasswordInput.value;
    const newPass = newPasswordInput.value;
    const confirmPass = confirmPasswordInput.value;

    if (!oldPass && !newPass && !confirmPass) {
        clearValidation(oldPasswordInput);
        clearValidation(newPasswordInput);
        clearValidation(confirmPasswordInput);
        return true;
    }

    let valid = true;

    if (!oldPass) {
        setValidation(oldPasswordInput, false, "Informe sua senha atual.");
        valid = false;
    } else {
        setValidation(oldPasswordInput, true, "");
    }

    if (newPass.length < 8) {
        setValidation(newPasswordInput, false, "A nova senha deve ter no mínimo 8 caracteres.");
        valid = false;
    } else if (newPass === oldPass) {
        setValidation(newPasswordInput, false, "A nova senha deve ser diferente da atual.");
        valid = false;
    } else {
        setValidation(newPasswordInput, true, "Senha válida.");
    }

    if (!confirmPass || confirmPass !== newPass) {
        setValidation(confirmPasswordInput, false, "As senhas não coincidem.");
        valid = false;
    } else {
        setValidation(confirmPasswordInput, true, "Senhas coincidem.");
    }

    return valid;
}
function validateDisplayName() {
    const value = displayNameInput.value.trim();

    if (value.length === 0) {
        clearValidation(displayNameInput);
        return true;
    }

    if (value.length < 3) {
        setValidation(
            displayNameInput,
            false,
            "Display name must be at least 3 characters long."
        );
        return false;
    }

    if (value.length > 50) {
        setValidation(
            displayNameInput,
            false,
            "Display name cannot exceed 50 characters."
        );
        return false;
    }

    setValidation(displayNameInput, true, "Display name is valid.");
    return true;
}

function validateBio() {
    const value = bioInput.value;

    if (value.length > 500) {
        setValidation(
            bioInput,
            false,
            "The bio cannot exceed 500 characters."
        );
        return false;
    }

    setValidation(bioInput, true, `${value.length}/500 characters`);
    return true;
}

function validateBannerColor() {
    const value = bannerColorInput.value;

    if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
        setValidation(
            bannerColorInput,
            false,
            "Invalid hex color."
        );
        return false;
    }

    setValidation(bannerColorInput, true, "Valid color.");
    return true;
}

displayNameInput.addEventListener("input", validateDisplayName);

bioInput.addEventListener("input", validateBio);

oldPasswordInput.addEventListener("input", validatePassword);
newPasswordInput.addEventListener("input", validatePassword);
confirmPasswordInput.addEventListener("input", validatePassword);

bannerColorInput.addEventListener("input", () => {
    validateBannerColor();
    bannerPreview.style.background = bannerColorInput.value;
});

profilePictureInput.addEventListener("change", () => {
    removeProfilePictureFlag = false;
    validateImage(profilePictureInput);
});

bannerPreview.addEventListener("click", () => {
    bannerInput.click();
});

bannerInput.addEventListener("change", () => {

    removeBannerFlag = false;

    if (!validateImage(bannerInput)) {
        return;
    }

    const file = bannerInput.files[0];

    if (!file) {
        return;
    }

    bannerFileName.textContent = file.name;

    if (lastBannerObjectURL) {
        URL.revokeObjectURL(lastBannerObjectURL);
    }

    lastBannerObjectURL = URL.createObjectURL(file);

    bannerPreviewImage.src = lastBannerObjectURL;
    bannerPreviewImage.classList.remove("d-none");
});

removeProfilePictureBtn.addEventListener("click", () => {

    removeProfilePictureFlag = true;

    profilePictureInput.value = "";

    clearValidation(profilePictureInput);

    const preview = document.getElementById("profilePicturePreview");

    if (preview) {
        preview.src = "/img/default-avatar.png";
    }
});

removeBannerBtn.addEventListener("click", () => {

    removeBannerFlag = true;

    bannerInput.value = "";

    clearValidation(bannerInput);

    if (lastBannerObjectURL) {
        URL.revokeObjectURL(lastBannerObjectURL);
        lastBannerObjectURL = null;
    }

    bannerPreviewImage.src = "";
    bannerPreviewImage.classList.add("d-none");

    bannerFileName.textContent = "No file selected";

    bannerPreview.style.background = bannerColorInput.value;
});

document.querySelectorAll(".togglePassword").forEach(button => {
    button.addEventListener("click", () => {

        const input = button.parentElement.querySelector("input");

        if (input.type === "password") {
            input.type = "text";
            button.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
        } else {
            input.type = "password";
            button.innerHTML = '<i class="fa-regular fa-eye"></i>';
        }

    });
});

document.getElementById("saveProfileBtn").addEventListener("click", async () => {

    const isValid = validateDisplayName() && validateBio() && validateBannerColor() &&
        validateImage(profilePictureInput) && validateImage(bannerInput) && validatePassword();

    if (!isValid) {
        return;
    }
    document.getElementById("saveProfileBtn").disabled = true;

    const formData = new FormData();

    formData.append("displayName", displayNameInput.value.trim());
    formData.append("bio", bioInput.value);
    formData.append("bannerColor", bannerColorInput.value);

    formData.append("removeProfilePicture", removeProfilePictureFlag);
    formData.append("removeBanner", removeBannerFlag);

    // Só envia troca de senha se o usuário preencheu os campos
    if (oldPasswordInput.value && newPasswordInput.value) {
        formData.append("oldPassword", oldPasswordInput.value);
        formData.append("newPassword", newPasswordInput.value);
    }

    const profilePicture = profilePictureInput.files[0];
    const banner = bannerInput.files[0];

    if (profilePicture && !removeProfilePictureFlag) {
        formData.append("profilePicture", profilePicture);
    }

    if (banner && !removeBannerFlag) {
        formData.append("banner", banner);
    }

    try {

        const response = await api("/api/me/update", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            credentials: "include",
            body: formData
        });

        let data = response

        if (response.ok) {

            if (lastBannerObjectURL) {
                URL.revokeObjectURL(lastBannerObjectURL);
                lastBannerObjectURL = null;
            }

            oldPasswordInput.value = "";
            newPasswordInput.value = "";
            confirmPasswordInput.value = "";

            window.location.href = "/users/" + data.userId + "/settings?t=success&m=Profile+updated+successfully";

        } else {
            toast(data.message || "Error updating profile.", "error");
        }

    } catch (err) {

        console.error(err);
        alert("Unable to connect to the server.");

    } finally {
        document.getElementById("saveProfileBtn").disabled = false;
    }

});

window.addEventListener("beforeunload", () => {
    if (lastBannerObjectURL) {
        URL.revokeObjectURL(lastBannerObjectURL);
    }
});

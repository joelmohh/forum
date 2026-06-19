const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const profilePictureInput = document.getElementById("profilePicture");

function setValidation(input, valid, message) {
    const messageContainer = document.getElementById(`${input.id}-message`);

    input.classList.remove("is-valid", "is-invalid");

    if (valid) {
        input.classList.add("is-valid");
        messageContainer.innerHTML =
            `<div class="valid-feedback d-block">${message}</div>`;
    } else {
        input.classList.add("is-invalid");
        messageContainer.innerHTML =
            `<div class="invalid-feedback d-block">${message}</div>`;
    }
}

function clearValidation(input) {
    const messageContainer = document.getElementById(`${input.id}-message`);

    input.classList.remove("is-valid", "is-invalid");
    messageContainer.innerHTML = "";
}
displayNameInput.addEventListener("input", () => {
    const value = displayNameInput.value.trim();

    if (value.length === 0) {
        clearValidation(displayNameInput);
        return;
    }

    if (value.length < 3) {
        setValidation(
            displayNameInput,
            false,
            "Display name must be at least 3 characters long."
        );
        return;
    }

    if (value.length > 50) {
        setValidation(
            displayNameInput,
            false,
            "Display name cannot exceed 50 characters."
        );
        return;
    }

    setValidation(displayNameInput, true, "Display name is valid.");
});
bioInput.addEventListener("input", () => {
    const value = bioInput.value;

    if (value.length > 500) {
        setValidation(bioInput, false, "The bio cannot exceed 500 characters.");
        return;
    }

    setValidation(bioInput, true, `${value.length}/500 characters`);
});
profilePictureInput.addEventListener("change", () => {
    const file = profilePictureInput.files[0];

    if (!file) {
        clearValidation(profilePictureInput);
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    ];

    if (!allowedTypes.includes(file.type)) {
        setValidation(profilePictureInput, false, "Invalid format.");
        profilePictureInput.value = "";
        return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
        setValidation(profilePictureInput, false, "Image must be at most 5MB.");
        profilePictureInput.value = "";
        return;
    }

    setValidation(profilePictureInput, true, "Valid image.");
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

    let hasError = false;

    if (
        displayNameInput.value.trim().length > 0 &&
        displayNameInput.value.trim().length < 3
    ) {
        hasError = true;
    }

    const file = profilePictureInput.files[0];

    if (file) {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
            hasError = true;
        }
    }

    if (hasError) {
        return;
    }

    const formData = new FormData();

    formData.append("displayName", displayNameInput.value);
    formData.append("bio", bioInput.value);

    if (file) {
        formData.append("profilePicture", file);
    }

    const response = await fetch("/api/me/update", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: formData,
        credentials: "include"
    });

    const data = await response.json();

    if (response.ok) {
        alert("Profile updated successfully.");
        location.reload();
    } else {
        alert(data.message || "Error updating profile.");
    }
});
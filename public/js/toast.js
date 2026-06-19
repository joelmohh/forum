function showToast(message, type = "info", duration = 3000) {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.classList.add("toast", `toast-${type}`);
    toast.classList.add("show");
    toast.textContent = message;

    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("fade-out");
        toast.addEventListener("transitionend", () => {
            toast.remove();
        });
    }, duration);
}

function closeToast(toast) {
    toast.classList.add("fade-out");
    toast.addEventListener("transitionend", () => {
        toast.remove();
    });
}

document.addEventListener("click", (event) => {
    if (event.target.classList.contains("toast")) {
        closeToast(event.target);
    }
});



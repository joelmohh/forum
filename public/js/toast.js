function showToast(message, type = "info", duration = 3000) {
    const toastContainer = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.classList.add("toast", `toast-${type}`);
    toast.classList.add("show");
    toast.textContent = message;

    if (!toastContainer) {
        const newToastContainer = document.createElement("div");
        newToastContainer.id = "toast-container";
        document.body.appendChild(newToastContainer);
        newToastContainer.appendChild(toast);
    } else {
        toastContainer.appendChild(toast);
    }
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

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.search.startsWith("?t=")) {
        const urlParams = new URLSearchParams(window.location.search);
        const type = urlParams.get("t");
        const message = urlParams.get("m");
        
        showToast(message, type);

        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
});

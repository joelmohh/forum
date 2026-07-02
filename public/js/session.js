let refreshPromise = null;

async function refreshToken() {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            const res = await fetch("/api/auth/refresh", {
                method: "POST",
                credentials: "include"
            });

            if (!res.ok) {
                throw new Error("Refresh failed");
            }

            const data = await res.json();

            if (!data.accessToken) {
                throw new Error("No access token returned");
            }

            localStorage.setItem("token", data.accessToken);

            return data.accessToken;
        })().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

async function api(url, options = {}) {

    const token = localStorage.getItem("token");

    const isFormData = options.body instanceof FormData;

    const headers = {
        ...(options.headers || {}),
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    let response = await fetch(url, {
        ...options,
        credentials: "include",
        headers
    });

    if (response.status === 401) {
        try {
            await refreshToken();

            const newToken = localStorage.getItem("token");

            const retryHeaders = {
                ...(options.headers || {}),
                ...(newToken ? { "Authorization": `Bearer ${newToken}` } : {})
            };

            if (!isFormData) {
                retryHeaders["Content-Type"] = "application/json";
            }

            response = await fetch(url, {
                ...options,
                credentials: "include",
                headers: retryHeaders
            });

        } catch {
            window.location.href = "/login";
            return;
        }
    }

    const contentType = response.headers.get("content-type");

    if (!response.ok) {
        let error = "An error occurred";

        if (contentType?.includes("application/json")) {
            const data = await response.json();
            error = data.message || error;
        }

        throw new Error(error);
    }

    return contentType?.includes("application/json")
        ? response.json()
        : response.text();
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".revoke-session-btn").forEach(btn => {
        btn.addEventListener("click", async () => {

            const sessionId = btn.dataset.sessionId;

            if (!confirm("Revoke this session?")) return;

            const res = await api(`/api/sessions/${sessionId}/revoke`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (res.ok) {
                showToast("Session revoked successfully");
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        });
    });

    document.getElementById("revokeAllSessions")
        ?.addEventListener("click", async () => {

            if (!confirm("Sign out from all other devices?")) return;

            const res = await api("/api/sessions/revoke-all", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            console.log(res)

            if (res.ok) {
                window.location.reload();
            }
        });

})
let refreshPromise = null;

async function refreshToken() {
    if (!refreshPromise) {
        refreshPromise = fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include"
        })
        .then(res => {
            if (!res.ok) {
                throw new Error("Refresh failed");
            }
        })
        .finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

async function api(url, options = {}) {
    let response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    if (response.status === 401) {
        try {
            await refreshToken();

            response = await fetch(url, {
                ...options,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers
                }
            });
        } catch {
            window.location.href = "/login";
            return;
        }
    }

    const contentType = response.headers.get("content-type");

    if (!response.ok) {
        let error = "Erro desconhecido";

        if (contentType?.includes("application/json")) {
            const data = await response.json();
            error = data.message || error;
        }

        throw new Error(error);
    }

    if (contentType?.includes("application/json")) {
        return response.json();
    }

    return response.text();
}

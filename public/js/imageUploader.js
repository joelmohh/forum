document.addEventListener("DOMContentLoaded", () => {
    const inputs = document.querySelectorAll(".imageUploadable");

    for (const input of inputs) {
        input.addEventListener("paste", async (event) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            const imageItem = [...items].find(item => item.type.startsWith("image/"));
            if (!imageItem) return;

            event.preventDefault();

            const file = imageItem.getAsFile();
            if (!file) return;

            const placeholder = "Uploading image...";

            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? start;

            input.setRangeText(placeholder, start, end, "end");

            const formData = new FormData();
            formData.append("file", file);

            try {
                const data = await api("/api/upload", {
                    method: "POST",
                    body: formData,
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    },
                });

                if (!data.ok || !data.url) {
                    throw new Error(data.message || "Upload failed");
                }

                input.value = input.value.replace(placeholder, `![Image](${data.url})`);
            } catch (err) {
                input.value = input.value.replace(placeholder, "");
                console.error("Error uploading image:", err);
            }
        });
    }
});
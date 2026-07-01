document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.imageUploadable');

    inputs.forEach(input => {
        console.log("Image uploadable input found:", input);
        input.addEventListener("paste", (event) => {
            const items = event.clipboardData?.items;

            if (!items) {
                console.log("No items found in clipboardData");
                return;
            }

            for (let item of items) {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    const formData = new FormData();
                    formData.append("file", file);

                    api("/api/upload", {
                        method: "POST",
                        body: formData,
                        headers: {
                            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                        }
                    }).then(data => {
                        if (data.ok && data.url) {
                            const cursorPosition = input.selectionStart;
                            const textBeforeCursor = input.value.substring(0, cursorPosition);
                            const textAfterCursor = input.value.substring(cursorPosition);
                            input.value = `${textBeforeCursor}![Image](${data.url})${textAfterCursor}`;
                        } else {
                            console.error("Image upload failed:", data.message);
                        }
                    }).catch(err => {
                        console.error("Error uploading image:", err);
                    });

                    event.preventDefault();

                }
            }
        });
    })
});
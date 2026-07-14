document.addEventListener("DOMContentLoaded", () => {
    const btnFollow = document.querySelector("#followBtn");

    if (!btnFollow) return;

    btnFollow.addEventListener("click", async () => {
        const userId = btnFollow.dataset.userId;
        const isFollowing = btnFollow.dataset.following === "true";

        btnFollow.disabled = true;

        try {
            const response = await api(`/api/users/${userId}/follow${isFollowing ? "?remove=true" : ""}`,
                {
                    method: "POST"
                });

            if (!response.ok) {
                showToast(response.message || "Something went wrong.", "error");
                return;
            }

            btnFollow.dataset.following = String(response.isFollowing);
            btnFollow.innerHTML = response.isFollowing ? '<i class="fa-solid fa-user-minus"></i> Unfollow' : '<i class="fa-solid fa-user-plus"></i> Follow';
            btnFollow.dataset.following = String(response.isFollowing);

            const followersCount = document.querySelector("#followersCount");

            if (followersCount) {
                let count = Number(followersCount.textContent);

                if (response.isFollowing && !isFollowing) {
                    count++;
                } else if (!response.isFollowing && isFollowing) {
                    count--;
                }

                followersCount.textContent = count;
            }

            showToast(response.message, "success");

        } catch (err) {
            console.error(err);
            showToast("Failed to contact the server.", "error");
        } finally {
            btnFollow.disabled = false;
        }
    });
});
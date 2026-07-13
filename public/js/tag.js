async function toggleFollow(button) {
    const tagName = button.dataset.tag;
    const following = button.dataset.following === "true";

    button.disabled = true;

    try {
        const data = await api(`/api/tags/${tagName}/${following ? "unfollow" : "follow"}`, {
            method: "POST"
        });

        if (!data.ok) {
            toast(data.message || "An error occurred.", "error");
            return;
        }

        if (following) {
            button.dataset.following = "false";
            button.className = "btn btn-outline-primary";
            button.innerHTML = `
                <i class="fa fa-plus me-1"></i>
                Follow
            `;
        } else {
            button.dataset.following = "true";
            button.className = "btn btn-outline-danger";
            button.innerHTML = `
                <i class="fa fa-minus me-1"></i>
                Unfollow
            `;
        }
        
        await updateFollowersCount(button, tagName);

    } catch (err) {
        console.error(err);
        toast("An unexpected error occurred.", "error");
    } finally {
        button.disabled = false;
    }
}

async function updateFollowersCount(button, tagName) {
    try {
        const tags = await api(`/api/tags/search?q=${encodeURIComponent(tagName)}`);

        if (!Array.isArray(tags.data) || tags.data.length === 0) return;

        const tag = tags.data.find(t => t.name === tagName);

        if (!tag) return;

        const counter = button
            .closest('.card')
            .querySelector('.followers-count');

        if (counter) {
            counter.textContent = tag.followersCount;
        }

    } catch (err) {
        console.error(err);
    }
}
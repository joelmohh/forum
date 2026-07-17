async function loadNotifications() {
    try {
        const json = await api('/api/notifications', { credentials: 'include' });
        if (!json.ok) return;

        const badge = document.getElementById('notifBadge');
        const list = document.getElementById('notifList');

        if (json.unreadCount > 0) {
            badge.textContent = json.unreadCount;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }

        if (!json.data.length) {
            list.innerHTML = '<div class="px-3 py-2 text-muted small">No notifications</div>';
            return;
        }

        list.innerHTML = json.data.slice(0, 5).map(n => `
            <a href="${n.link}" class="dropdown-item py-2 notif-item ${n.isRead ? '' : 'fw-semibold'}" data-id="${n._id}">
                ${n.content}
            </a>
        `).join('');

        list.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const id = item.dataset.id;
                try {
                    await api(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' });
                } catch (err) {
                    console.error('Failed to mark notification as read', err);
                }
            });
        });
    } catch (err) {
        console.error('Failed to load notifications', err);
    }
}

document.addEventListener('DOMContentLoaded', loadNotifications);
document.getElementById('notifBtn')?.addEventListener('click', loadNotifications);
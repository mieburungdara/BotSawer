/**
 * Groups Page Module
 */
export async function loadGroupsPage(app) {
    const data = await app.apiCall('ecosystem.php');
    const groups = data.groups || [];

    let groupsHtml = '';
    groups.forEach(group => {
        groupsHtml += `
            <div class="card" style="margin-bottom: 15px; padding: 16px;">
                <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white;">
                        <i data-lucide="users" style="width: 20px; height: 20px;"></i>
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 15px;">${group.name}</h4>
                        <p style="margin: 0; font-size: 11px; color: var(--hint-color);">@${group.username}</p>
                    </div>
                </div>
                <p style="font-size: 13px; color: var(--hint-color); line-height: 1.5; margin-bottom: 15px;">${group.description}</p>
                <button class="btn btn-secondary btn-sm w-full" onclick="window.open('https://t.me/${group.username}', '_blank')">Gabung Grup</button>
            </div>
        `;
    });

    return `
        <div class="grid-layout fade-in">
            <div class="col-full">
                <h2 style="font-family: 'Outfit', sans-serif; margin-bottom: 10px;">Grup Komunitas</h2>
                <p style="color: var(--hint-color); font-size: 14px; margin-bottom: 20px;">Bergabunglah dengan komunitas kami untuk berdiskusi.</p>
                ${groupsHtml || '<p style="text-align: center; color: var(--hint-color);">Belum ada grup tersedia.</p>'}
            </div>
        </div>
    `;
}

/**
 * Bots Page Module
 */
export async function loadBotsPage(app) {
    const data = await app.apiCall('ecosystem.php');
    const bots = data.bots || [];

    let botsHtml = '';
    bots.forEach(bot => {
        botsHtml += `
            <div class="card" style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px;">
                <div style="width: 50px; height: 50px; border-radius: 12px; background: var(--secondary-bg-color); display: flex; align-items: center; justify-content: center;">
                    <i data-lucide="bot" style="color: var(--primary);"></i>
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 15px;">${bot.name || bot.username}</h4>
                    <p style="margin: 3px 0 0; font-size: 12px; color: var(--hint-color);">@${bot.username}</p>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="window.open('https://t.me/${bot.username}', '_blank')">Buka</button>
            </div>
        `;
    });

    return `
        <div class="grid-layout fade-in">
            <div class="col-full">
                <h2 style="font-family: 'Outfit', sans-serif; margin-bottom: 10px;">Daftar Bot</h2>
                <p style="color: var(--hint-color); font-size: 14px; margin-bottom: 20px;">Gunakan bot resmi kami untuk berbagai kebutuhan Anda.</p>
                ${botsHtml || '<p style="text-align: center; color: var(--hint-color);">Belum ada bot tersedia.</p>'}
            </div>
        </div>
    `;
}

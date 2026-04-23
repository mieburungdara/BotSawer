/**
 * Channels Page Module
 */
export async function loadChannelsPage(app) {
    const data = await app.apiCall('ecosystem.php');
    const channels = data.channels || [];

    let channelsHtml = '';
    channels.forEach(ch => {
        channelsHtml += `
            <div class="card" style="margin-bottom: 15px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0; font-size: 16px;">${ch.name}</h4>
                        <span style="font-size: 11px; color: var(--primary); font-weight: 700; text-transform: uppercase;">${ch.category}</span>
                    </div>
                    <span style="font-size: 10px; padding: 2px 6px; background: rgba(0,0,0,0.05); border-radius: 4px; color: var(--hint-color);">${ch.type}</span>
                </div>
                <p style="font-size: 13px; color: var(--hint-color); line-height: 1.5; margin-bottom: 15px;">${ch.description}</p>
                <button class="btn btn-primary btn-sm w-full" onclick="window.open('https://t.me/${ch.username}', '_blank')">Ikuti Channel</button>
            </div>
        `;
    });

    return `
        <div class="grid-layout fade-in">
            <div class="col-full">
                <h2 style="font-family: 'Outfit', sans-serif; margin-bottom: 10px;">Channel Pilihan</h2>
                <p style="color: var(--hint-color); font-size: 14px; margin-bottom: 20px;">Dapatkan informasi eksklusif melalui channel resmi kami.</p>
                ${channelsHtml || '<p style="text-align: center; color: var(--hint-color);">Belum ada channel tersedia.</p>'}
            </div>
        </div>
    `;
}

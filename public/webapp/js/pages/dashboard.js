import { formatNumber } from '../utils.js';

export async function loadDashboard(app) {
    const response = await app.apiCall('dashboard.php');
    const data = response.data;
    const announcements = data.announcements || [];
    const stats = data.stats || {};

    let announcementsHtml = '';
    if (announcements.length > 0) {
        announcements.forEach(ann => {
            const typeClass = `announcement-${ann.type}`;
            const iconMap = {
                'info': 'info',
                'warning': 'alert-triangle',
                'success': 'check-circle',
                'danger': 'alert-circle'
            };
            const icon = iconMap[ann.type] || 'info';
            
            announcementsHtml += `
                <div class="announcement-card ${typeClass}">
                    <div class="announcement-header">
                        <i data-lucide="${icon}"></i>
                        <span class="announcement-title">${ann.title}</span>
                    </div>
                    <div class="announcement-body">
                        ${ann.content}
                    </div>
                    <div class="announcement-footer">
                        ${new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                    </div>
                </div>
            `;
        });
    }

    return `
        <div class="grid-layout fade-in">
            <!-- Announcements Section -->
            <div class="col-full">
                ${announcementsHtml}
            </div>

            <!-- Stats Overview -->
            <div class="card" onclick="window.app.loadPage('wallet')" style="cursor: pointer; transition: transform 0.2s; border-bottom: 2px solid var(--primary);" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <span style="font-size: 13px; color: var(--hint-color);">Saldo Tersedia</span>
                        <span style="font-size: 24px; font-weight: 800; color: var(--primary);">Rp ${formatNumber(stats.balance || 0)}</span>
                    </div>
                    <i data-lucide="chevron-right" style="width: 18px; height: 18px; color: var(--hint-color);"></i>
                </div>
            </div>

            <div class="card">
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <span style="font-size: 13px; color: var(--hint-color);">Total Donasi</span>
                    <span style="font-size: 24px; font-weight: 800; color: var(--success);">Rp ${formatNumber(stats.total_donations || 0)}</span>
                </div>
            </div>

            <div class="card">
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <span style="font-size: 13px; color: var(--hint-color);">Konten Aktif</span>
                    <span style="font-size: 24px; font-weight: 800; color: var(--text-color);">${stats.active_contents || 0} Media</span>
                </div>
            </div>

            <div class="card col-full">
                <h3><i data-lucide="zap"></i> Akses Cepat</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px;">
                    <button class="btn btn-secondary" onclick="window.app.loadPage('creator')" style="height: 60px; flex-direction: column; font-size: 12px; gap: 4px;">
                        <i data-lucide="user"></i>
                        Profil Kreator
                    </button>
                    <button class="btn btn-secondary" onclick="window.app.loadPage('contents')" style="height: 60px; flex-direction: column; font-size: 12px; gap: 4px;">
                        <i data-lucide="layout"></i>
                        Kelola Konten
                    </button>
                </div>
            </div>
        </div>
    `;
}

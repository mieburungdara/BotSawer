import { formatCompactNumber, getRelativeTime } from '../utils.js';

/**
 * Profile Page Module
 */

export function viewPublicCreatorProfile(app, userId) {
    app.currentPage = 'profile';
    viewOtherProfile(app, userId);
}

export async function loadProfile(app) {
    return viewOtherProfile(app, app.userData.id);
}

export async function viewOtherProfile(app, userId) {
    try {
        // Render loading state if switching page
        if (app.currentPage === 'profile') {
            document.getElementById('pageContent').innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner" style="margin: 0 auto;"></div><p style="margin-top: 12px; color: var(--hint-color); font-size: 13px;">Memuat profil...</p></div>';
        }

        const data = await app.apiCall('explore.php', {
            action: 'get_profile',
            userId: userId
        });

        const { user, creator, stats, activity, badges, media } = data;
        const isOwnProfile = (userId === app.userData.id);

        // Use badges from API, or fallback to current session data if own profile
        const hasPosted = isOwnProfile ? app.userData.has_posted : badges?.has_posted;
        const hasDonated = isOwnProfile ? app.userData.has_donated : badges?.has_donated;

        let html = `
            <div class="fade-in">
                <!-- Profile Header -->
                <div class="profile-hero">
                    ${!isOwnProfile ? `
                    <button class="profile-back-btn" onclick="app.loadPage('explore')">
                        <i data-lucide="arrow-left"></i>
                    </button>
                    ` : ''}
                    <div class="profile-hero-bg"></div>
                    <div class="profile-avatar-wrapper">
                        <div class="profile-avatar ${creator?.is_verified ? 'verified' : ''}" ${user.photo_url ? 'style="font-size: 0;"' : ''}>
                            ${user.photo_url 
                                ? `<img src="${user.photo_url}" alt="Avatar">` 
                                : (creator?.display_name || user.name || 'U').charAt(0).toUpperCase()}
                            ${creator?.is_verified ? '<div class="profile-verified-badge"><i data-lucide="check" style="width:12px;height:12px"></i></div>' : ''}
                        </div>
                    </div>
                    
                    <div class="profile-info">
                        <h2 class="profile-name">${creator?.display_name || user.name}</h2>
                        <p class="profile-username">@${user.username || 'user'}</p>
                        
                        <div class="profile-badges">
                            ${hasPosted ? '<span class="status-badge creator"><i data-lucide="award"></i> Kreator</span>' : ''}
                            ${hasDonated ? '<span class="status-badge" style="color: var(--primary); border-color: var(--primary);"><i data-lucide="heart"></i> Donatur</span>' : ''}
                        </div>

                        ${creator?.bio ? `<p class="profile-bio">${creator.bio}</p>` : ''}
                    </div>
                    
                    <div class="profile-actions">
                        ${isOwnProfile ? `
                            <button class="btn btn-secondary btn-sm" onclick="app.loadPage('wallet')">
                                <i data-lucide="wallet"></i> Dompet
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="app.loadPage('achievements')">
                                <i data-lucide="trophy"></i> Pencapaian
                            </button>
                        ` : `
                            <button class="btn btn-primary profile-support-btn" onclick="app.viewPublicCreatorProfileLink(${user.id})">
                                <i data-lucide="heart"></i> Dukung Melalui Bot
                            </button>
                        `}
                    </div>
                </div>

                <div class="profile-content-padding">
                    <!-- Stats Box -->
                    <div class="profile-stats-box">
                        ${stats.is_creator ? `
                            <div class="stat-item">
                                <div class="stat-value text-primary">${stats.total_donations || 0}</div>
                                <div class="stat-label">Dukungan</div>
                            </div>
                            <div class="stat-divider"></div>
                            <div class="stat-item">
                                <div class="stat-value text-success">Rp ${formatCompactNumber(stats.total_earnings || 0)}</div>
                                <div class="stat-label">Earning</div>
                            </div>
                        ` : `
                            <div class="stat-item">
                                <div class="stat-value text-primary">${stats.total_donations_sent || 0}</div>
                                <div class="stat-label">Saweran</div>
                            </div>
                            <div class="stat-divider"></div>
                            <div class="stat-item">
                                <div class="stat-value text-accent">Rp ${formatCompactNumber(stats.total_amount_sent || 0)}</div>
                                <div class="stat-label">Total</div>
                            </div>
                        `}
                    </div>

                    <!-- Media Gallery -->
                    ${media && media.length > 0 ? `
                        <div class="profile-section">
                            <h3 class="section-title"><i data-lucide="grid"></i> Galeri Konten</h3>
                            <div class="media-grid">
                                ${media.map(m => `
                                    <div class="media-card">
                                        <div class="media-icon">
                                            <i data-lucide="${m.file_type === 'video' ? 'video' : 'image'}"></i>
                                        </div>
                                        <div class="media-overlay">
                                            <div class="media-caption">${m.caption || 'Tanpa keterangan'}</div>
                                            <div class="media-meta">
                                                <span><i data-lucide="heart" style="width:10px;height:10px"></i> ${m.donation_count}</span>
                                                <span>Rp ${formatCompactNumber(m.donation_total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Activity -->
                    <div class="profile-section">
                        <h3 class="section-title"><i data-lucide="history"></i> Aktivitas ${isOwnProfile ? 'Saya' : 'Terbaru'}</h3>
                        <div class="activity-feed">
                            ${activity && activity.length > 0 ? activity.map(act => `
                                <div class="activity-item">
                                    <div class="activity-icon" style="background: ${act.from_user_id == user.id ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${act.from_user_id == user.id ? 'var(--accent)' : 'var(--success)'}">
                                        <i data-lucide="${act.from_user_id == user.id ? 'send' : 'download'}"></i>
                                    </div>
                                    <div class="activity-content">
                                        <div class="activity-header">
                                            <span class="donor-name">${act.from_user_id == user.id ? 'Mengirim' : 'Menerima'} Saweran</span>
                                            <span class="activity-amount" style="color: ${act.from_user_id == user.id ? 'var(--accent)' : 'var(--success)'}">${act.from_user_id == user.id ? '-' : '+'}Rp ${formatCompactNumber(act.amount)}</span>
                                        </div>
                                        <div class="activity-time">${getRelativeTime(act.created_at)}</div>
                                    </div>
                                </div>
                            `).join('') : '<div class="empty-state-simple">Belum ada aktivitas</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        if (app.currentPage === 'profile' || isOwnProfile === false) {
            document.getElementById('pageContent').innerHTML = html;
            if (window.lucide) window.lucide.createIcons();
        }
        return html;
    } catch (error) {
        console.error('Profile error:', error);
        return `<div class="card"><h3>Error</h3><p>${error.message}</p></div>`;
    }
}

export function viewPublicCreatorProfileLink(app, userId) {
    // Redirect to their public page or open in bot
    const botUsername = 'MieBurungDaraBot'; // Fallback
    const url = `https://t.me/${botUsername}?start=creator_${userId}`;
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

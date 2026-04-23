import { formatNumber, getRelativeTime } from '../utils.js';

/**
 * Content Detail Page Module
 */
export async function loadContentDetail(app, shortId) {
    try {
        const result = await app.apiCall('content.php', { short_id: shortId });
        const content = result.data;

        if (content.is_owner) {
            return renderOwnerView(app, content);
        } else {
            return renderPublicView(app, content);
        }
    } catch (error) {
        return `
            <div class="card" style="text-align: center; margin-top: 50px;">
                <i data-lucide="shield-alert" style="width: 48px; height: 48px; color: var(--danger); margin-bottom: 15px;"></i>
                <h3>🚫 Akses Dibatasi</h3>
                <p style="color: var(--hint-color); margin-top: 10px;">${error.message}</p>
                <button class="btn btn-secondary mt-4" onclick="app.loadPage('dashboard')">
                    <i data-lucide="home"></i> Kembali ke Dashboard
                </button>
            </div>
        `;
    }
}

function renderOwnerView(app, content) {
    const isDraft = content.status === 'draft';
    
    return `
        <div class="grid-layout fade-in">
            <div class="card col-full">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <h3 style="margin-bottom: 4px;"><i data-lucide="image"></i> Konten #${content.short_id}</h3>
                        <div style="font-size: 12px; color: var(--hint-color);">Diupload ${new Date(content.created_at).toLocaleString('id-ID')}</div>
                    </div>
                    <span class="status-badge status-${content.status}" style="padding: 4px 10px;">
                        ${content.status.toUpperCase()}
                    </span>
                </div>

                <div class="form-group">
                    <label>Tipe Media</label>
                    <div style="font-weight: 600; padding: 10px; background: var(--secondary-bg); border-radius: var(--radius-md);">
                        <i data-lucide="${content.file_type === 'video' ? 'video' : 'camera'}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;"></i>
                        ${content.file_type.toUpperCase()}
                        ${content.media_group_id ? ' (Album)' : ''}
                    </div>
                </div>

                ${isDraft ? `
                    <div class="form-group">
                        <label>Caption / Pesan Konten</label>
                        <textarea id="editCaption" rows="4" placeholder="Tulis caption untuk konten ini..." style="width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; background: var(--bg-color); color: var(--text-color);">${content.caption || ''}</textarea>
                    </div>
                    <div class="alert alert-info" style="margin-bottom: 20px;">
                        <i data-lucide="info"></i> Konten ini masih berstatus <b>Draft</b>. Klik publikasikan agar user lain dapat memberikan donasi.
                    </div>
                    <button class="btn btn-primary" style="width: 100%;" onclick="app.confirmContent('${content.short_id}')">
                        <i data-lucide="send"></i> Konfirmasi & Publikasikan
                    </button>
                ` : `
                    <div class="form-group">
                        <label>Caption</label>
                        <div style="padding: 10px; background: var(--secondary-bg); border-radius: var(--radius-md); font-size: 14px;">
                            ${content.caption || '<i style="color: var(--hint-color);">Tidak ada caption</i>'}
                        </div>
                    </div>
                    <div class="alert alert-success">
                        <i data-lucide="check-circle"></i> Konten sudah aktif dan dapat menerima donasi.
                    </div>
                `}
            </div>

            ${!isDraft ? `
                <div class="card col-full">
                    <h3><i data-lucide="bar-chart-3"></i> Statistik Konten</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                        <div style="padding: 15px; background: var(--secondary-bg); border-radius: var(--radius-md); text-align: center;">
                            <div style="font-size: 20px; font-weight: 700; color: var(--success);">Rp ${formatNumber(content.total_donations || 0)}</div>
                            <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase;">Total Donasi</div>
                        </div>
                        <div style="padding: 15px; background: var(--secondary-bg); border-radius: var(--radius-md); text-align: center;">
                            <div style="font-size: 20px; font-weight: 700; color: var(--primary);">${content.donation_count || 0}</div>
                            <div style="font-size: 11px; color: var(--hint-color); text-transform: uppercase;">Jumlah Donatur</div>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderPublicView(app, content) {
    return `
        <div class="grid-layout fade-in">
            <div class="card col-full" style="text-align: center;">
                <div style="width: 64px; height: 64px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                    <i data-lucide="image" style="width: 32px; height: 32px;"></i>
                </div>
                <h3>Konten Premium #${content.short_id}</h3>
                <p style="color: var(--hint-color); margin-bottom: 20px;">Berikan donasi untuk mendukung kreator ini</p>
                
                <div style="padding: 20px; background: var(--secondary-bg); border-radius: var(--radius-md); margin-bottom: 20px;">
                    <div style="font-size: 12px; color: var(--hint-color); margin-bottom: 5px;">KREATOR</div>
                    <div style="font-size: 18px; font-weight: 700; color: var(--primary); cursor: pointer;" onclick="app.viewPublicCreatorProfile('${content.creator.uuid}')">
                        ${content.creator.display_name} ${content.creator.is_verified ? ' <i data-lucide="check-circle" style="width: 14px; height: 14px; color: var(--primary); vertical-align: middle;"></i>' : ''}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                    <div>
                        <div style="font-size: 11px; color: var(--hint-color);">TERKUMPUL</div>
                        <div style="font-size: 16px; font-weight: 600; color: var(--success);">Rp ${formatNumber(content.stats.total_amount)}</div>
                    </div>
                    <div>
                        <div style="font-size: 11px; color: var(--hint-color);">DONATUR</div>
                        <div style="font-size: 16px; font-weight: 600;">${content.stats.donation_count} Orang</div>
                    </div>
                </div>

                <button class="btn btn-primary" style="width: 100%;" onclick="window.open('https://t.me/${app.settings.bot_username}?start=sawer_${content.short_id}', '_blank')">
                    <i data-lucide="heart"></i> Kirim Donasi Sekarang
                </button>
            </div>
        </div>
    `;
}

export async function confirmContent(app, contentId) {
    const caption = document.getElementById('editCaption').value;

    try {
        await app.apiCall('creator.php', {
            action: 'confirm_content',
            contentId: contentId,
            caption: caption
        });
        
        app.telegram.showAlert('✅ Konten berhasil dipublikasikan!');
        app.loadPage('contents');
    } catch (error) {
        app.telegram.showAlert('❌ Gagal mempublikasikan: ' + error.message);
    }
}

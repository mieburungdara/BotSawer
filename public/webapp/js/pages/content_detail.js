import { formatNumber, getRelativeTime } from '../utils.js';

/**
 * Content Detail Page Module
 */
export async function loadContentDetail(app, shortId) {
    try {
        const content = await app.apiCall('content.php', { short_id: shortId, action: 'get' });

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
    const isQueued = content.status === 'queued';
    
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
                    <label>Media (${content.media_list.length} File)</label>
                    <div style="display: flex; overflow-x: auto; gap: 10px; margin-bottom: 15px; padding-bottom: 10px; scroll-snap-type: x mandatory;">
                        ${content.media_list.map((media, index) => `
                            <div style="flex: 0 0 100%; scroll-snap-align: center; text-align: center;">
                                <div style="margin-bottom: 5px; font-size: 12px; color: var(--hint-color);">Media ${index + 1} dari ${content.media_list.length}</div>
                                ${media.imagekit_url ? `
                                    <img src="${media.imagekit_url}" alt="Thumbnail" style="max-width: 100%; max-height: 300px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                                ` : `
                                    <div style="padding: 20px; background: var(--secondary-bg); border-radius: var(--radius-md); color: var(--hint-color);">
                                        <i data-lucide="${media.file_type === 'video' ? 'video' : (media.file_type === 'photo' ? 'image' : 'file')}" style="width: 48px; height: 48px; margin-bottom: 10px;"></i>
                                        <div>Tidak ada thumbnail</div>
                                    </div>
                                `}
                            </div>
                        `).join('')}
                    </div>
                    
                    ${content.media_list.some(m => !m.imagekit_url && m.has_thumbnail_source) ? `
                        <button class="btn btn-outline-primary" style="width: 100%;" onclick="app.generateThumbnail('${content.short_id}')" id="btnGenThumb">
                            <i data-lucide="image-plus"></i> Generate Thumbnail
                        </button>
                    ` : ''}
                </div>

                <div class="form-group" style="margin-top: 15px;">
                    <label>Tipe Konten</label>
                    <div style="font-weight: 600; padding: 10px; background: var(--secondary-bg); border-radius: var(--radius-md);">
                        <i data-lucide="${content.media_list.length > 1 ? 'layers' : (content.media_list[0]?.file_type === 'video' ? 'video' : 'camera')}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;"></i>
                        ${content.media_list.length > 1 ? 'ALBUM' : (content.media_list[0]?.file_type || 'UNKNOWN').toUpperCase()}
                    </div>
                </div>

                <div class="form-group">
                    <label>Caption / Pesan Konten</label>
                    ${isDraft ? `
                        <textarea id="editCaption" rows="4" placeholder="Tulis caption..." style="width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; background: var(--bg-color); color: var(--text-color);">${content.caption || ''}</textarea>
                    ` : `
                        <div style="padding: 10px; background: var(--secondary-bg); border-radius: var(--radius-md); font-size: 14px;">
                            ${content.caption || '<i style="color: var(--hint-color);">Tidak ada caption</i>'}
                        </div>
                    `}
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    ${isDraft ? `
                        <button class="btn btn-primary" onclick="app.confirmContent('${content.short_id}')">
                            <i data-lucide="send"></i> Konfirmasi & Publikasikan
                        </button>
                    ` : ''}

                    ${isQueued ? `
                        <button class="btn btn-secondary" onclick="app.cancelQueue('${content.short_id}')">
                            <i data-lucide="rotate-ccw"></i> Batalkan Antrean (Jadi Draft)
                        </button>
                    ` : ''}

                    <button class="btn btn-outline-danger" onclick="app.deleteContent('${content.short_id}')">
                        <i data-lucide="trash-2"></i> Hapus Konten
                    </button>
                </div>
            </div>

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
        </div>
    `;
}

function renderPublicView(app, content) {
    return `
        <div class="grid-layout fade-in">
            <div class="card col-full" style="text-align: center;">
                <div style="display: flex; overflow-x: auto; gap: 10px; margin-bottom: 20px; padding-bottom: 10px; scroll-snap-type: x mandatory;">
                    ${content.media_list.map((media, index) => `
                        <div style="flex: 0 0 100%; scroll-snap-align: center;">
                            ${content.media_list.length > 1 ? `<div style="margin-bottom: 5px; font-size: 12px; color: var(--hint-color);">File ${index + 1} dari ${content.media_list.length}</div>` : ''}
                            ${media.imagekit_url ? `
                                <img src="${media.imagekit_url}" alt="Preview" style="max-width: 100%; max-height: 250px; border-radius: var(--radius-lg); border: 2px solid var(--border-color); box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            ` : `
                                <div style="width: 64px; height: 64px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                                    <i data-lucide="${media.file_type === 'video' ? 'video' : (media.file_type === 'photo' ? 'image' : 'file')}" style="width: 32px; height: 32px;"></i>
                                </div>
                            `}
                        </div>
                    `).join('')}
                </div>
                <h3>${content.media_list.length > 1 ? 'Album Premium' : 'Konten Premium'} #${content.short_id}</h3>
                <p style="color: var(--hint-color); margin-bottom: 20px;">Dukung karya kreator ini melalui WebApp</p>
                
                <div style="padding: 20px; background: var(--secondary-bg); border-radius: var(--radius-md); margin-bottom: 25px;">
                    <div style="font-size: 11px; color: var(--hint-color); margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">Kreator</div>
                    <div style="font-size: 18px; font-weight: 700; color: var(--primary);">
                        ${content.creator_id}
                    </div>
                </div>

                <div class="donation-box" style="text-align: left; padding: 20px; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: var(--bg-color);">
                    <h4 style="margin-bottom: 15px;"><i data-lucide="heart" style="color: var(--accent);"></i> Kirim Donasi</h4>
                    
                    <div class="form-group">
                        <label>Nominal Donasi (Rp)</label>
                        <input type="number" id="donateAmount" placeholder="Minimal 1.000" min="1000" step="1000" style="font-size: 18px; font-weight: 700;">
                    </div>
                    
                    <div class="form-group">
                        <label>Pesan (Opsional)</label>
                        <input type="text" id="donateMessage" placeholder="Tulis pesan penyemangat...">
                    </div>

                    <button class="btn btn-primary" style="width: 100%;" onclick="app.donateContent('${content.short_id}')">
                        <i data-lucide="credit-card"></i> Kirim Sekarang
                    </button>
                    
                    <p style="font-size: 11px; color: var(--hint-color); margin-top: 15px; text-align: center;">
                        <i data-lucide="shield-check" style="width: 12px; height: 12px; vertical-align: middle;"></i> Pembayaran aman menggunakan saldo WebApp Anda.
                    </p>
                </div>
            </div>
        </div>
    `;
}

export async function generateThumbnail(app, contentId) {
    const btn = document.getElementById('btnGenThumb');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Memproses...';
    }

    try {
        const result = await app.apiCall('content.php', { action: 'generate_thumbnail', short_id: contentId });
        app.telegram.showAlert('✅ ' + result.message);
        app.loadPage('content_detail', contentId);
    } catch (error) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="image-plus"></i> Generate Thumbnail';
            if (window.lucide) window.lucide.createIcons();
        }
        app.telegram.showAlert('❌ Gagal: ' + error.message);
    }
}

export async function confirmContent(app, contentId) {
    const caption = document.getElementById('editCaption').value;
    try {
        await app.apiCall('creator.php', { action: 'confirm_content', contentId: contentId, caption: caption });
        app.telegram.showAlert('✅ Konten berhasil dipublikasikan!');
        app.loadPage('contents');
    } catch (error) {
        app.telegram.showAlert('❌ Gagal mempublikasikan: ' + error.message);
    }
}

export async function cancelQueue(app, contentId) {
    if (!confirm('Batalkan dari antrean dan kembalikan ke Draft?')) return;
    try {
        await app.apiCall('content.php', { action: 'cancel_queue', short_id: contentId });
        app.telegram.showAlert('✅ Konten dikembalikan ke Draft');
        app.loadPage('content_detail', contentId);
    } catch (error) {
        app.telegram.showAlert('❌ Gagal: ' + error.message);
    }
}

export async function deleteContent(app, contentId) {
    if (!confirm('Hapus konten ini secara permanen dari daftar Anda?')) return;
    try {
        await app.apiCall('content.php', { action: 'delete_content', short_id: contentId });
        app.telegram.showAlert('✅ Konten berhasil dihapus');
        app.loadPage('contents');
    } catch (error) {
        app.telegram.showAlert('❌ Gagal menghapus: ' + error.message);
    }
}

export async function donateContent(app, contentId) {
    const amount = document.getElementById('donateAmount').value;
    const message = document.getElementById('donateMessage').value;

    if (!amount || amount < 1000) {
        app.telegram.showAlert('Minimal donasi adalah Rp 1.000');
        return;
    }

    try {
        const result = await app.apiCall('content.php', {
            action: 'donate',
            short_id: contentId,
            amount: amount,
            message: message
        });
        
        app.telegram.showAlert('💖 ' + result.message);
        app.updateHeaderStats();
        app.loadPage('content_detail', contentId);
    } catch (error) {
        if (error.message.includes('Saldo')) {
            if (confirm('Saldo tidak mencukupi. Topup sekarang?')) {
                app.loadPage('wallet');
            }
        } else {
            app.telegram.showAlert('❌ Gagal: ' + error.message);
        }
    }
}

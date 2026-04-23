import { formatNumber } from '../utils.js';

/**
 * Contents Page Module
 */
export async function loadContents(app, page = 1, highlightId = null) {
    if (!app.userData.is_creator) {
        return '<div class="card"><h3>Akses Ditolak</h3></div>';
    }

    const response = await app.apiCall('creator.php', { page: page, limit: 10 });
    const contents = response.recent_content || [];
    const paging = response.pagination;

    let tableRows = '';
    if (contents.length > 0) {
            const isHighlighted = highlightId && item.short_id == highlightId;
            tableRows += `
                <tr ${isHighlighted ? 'class="highlight-row" id="media-' + item.short_id + '"' : ''} 
                    data-status="${item.status}" data-caption="${item.caption || ''}">
                    <td>
                        <div style="font-weight: 600;">Media #${item.short_id}</div>
                        <div style="font-size: 11px; color: var(--hint-color);">${new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                        ${item.status === 'draft' ? '<span class="status-badge" style="background:rgba(244,63,94,0.1);color:var(--accent);padding:2px 6px;font-size:10px;">DRAFT</span>' : ''}
                    </td>
                    <td>${item.file_type}</td>
                    <td style="text-align: right;">
                        <div style="font-weight: 700; color: var(--success);">Rp ${formatNumber(item.total_donations)}</div>
                        <div style="font-size: 11px; color: var(--hint-color);">${item.donation_count} donasi</div>
                    </td>
                </tr>
            `;
        });
    } else {
        tableRows = '<tr><td colspan="3" class="text-center">Belum ada konten</td></tr>';
    }

    // Pagination buttons
    let paginationHtml = '';
    if (paging && paging.total_pages > 1) {
        paginationHtml = `
            <div style="display: flex; gap: 8px; justify-content: center; margin-top: 20px;">
                <button class="btn btn-secondary" style="padding: 8px 12px; width: auto;" 
                    ${paging.current_page <= 1 ? 'disabled' : `onclick="app.loadContents(${paging.current_page - 1})"`}>
                    <i data-lucide="chevron-left"></i>
                </button>
                ${Array.from({ length: paging.total_pages }, (_, i) => i + 1).map(p => `
                    <button class="btn ${p === paging.current_page ? 'btn-primary' : 'btn-secondary'}" 
                        style="padding: 8px 12px; width: auto;" onclick="app.loadContents(${p})">
                        ${p}
                    </button>
                `).join('')}
                <button class="btn btn-secondary" style="padding: 8px 12px; width: auto;" 
                    ${paging.current_page >= paging.total_pages ? 'disabled' : `onclick="app.loadContents(${paging.current_page + 1})"`}>
                    <i data-lucide="chevron-right"></i>
                </button>
            </div>
        `;
    }

    const html = `
        <div class="grid-layout fade-in">
            <div class="card col-full">
                <h3><i data-lucide="layers"></i> Daftar Konten</h3>
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Konten</th>
                                <th>Tipe</th>
                                <th style="text-align: right;">Total Donasi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
                ${paginationHtml}
            </div>
        </div>
    `;

    if (app.currentPage === 'contents') {
        document.getElementById('pageContent').innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
        
        // Scroll to highlighted row if exists
        if (highlightId) {
            const el = document.getElementById(`media-${highlightId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    return html;
}

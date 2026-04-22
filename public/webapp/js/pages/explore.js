/**
 * Explore Page Module
 */
export async function loadExplore(app) {
    const topCreators = await app.apiCall('explore.php', { action: 'get_top', limit: 10 });

    return `
        <div class="fade-in">
            <!-- Hero Search Section -->
            <div class="explore-hero">
                <div class="explore-hero-bg"></div>
                <div class="explore-hero-content">
                    <div class="explore-hero-icon">
                        <i data-lucide="compass"></i>
                    </div>
                    <h2 class="explore-title">Explore Kreator</h2>
                    <p class="explore-subtitle">Temukan dan dukung kreator favoritmu</p>
                    
                    <div class="explore-search-container">
                        <div class="explore-search-box">
                            <div class="explore-search-icon">
                                <i data-lucide="search"></i>
                            </div>
                            <input type="text" id="exploreSearchQuery" 
                                class="explore-search-input"
                                placeholder="Cari nama atau @username..." 
                                onkeyup="if(event.key === 'Enter') app.searchPublicCreators()"
                                autocomplete="off"
                            >
                            <button class="explore-search-btn" onclick="app.searchPublicCreators()">
                                <i data-lucide="arrow-right"></i>
                            </button>
                        </div>
                        <div class="explore-search-hints">
                            <span class="explore-hint-pill" onclick="document.getElementById('exploreSearchQuery').value=''; app.searchPublicCreators()">
                                <i data-lucide="flame" style="width:12px;height:12px"></i> Trending
                            </span>
                            <span class="explore-hint-pill" onclick="document.getElementById('exploreSearchQuery').value=''; app.searchPublicCreators()">
                                <i data-lucide="star" style="width:12px;height:12px"></i> Top
                            </span>
                            <span class="explore-hint-pill" onclick="document.getElementById('exploreSearchQuery').value=''; app.searchPublicCreators()">
                                <i data-lucide="sparkles" style="width:12px;height:12px"></i> Terbaru
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Results -->
            <div class="explore-results-section">
                <div class="explore-results-header">
                    <h3><i data-lucide="users"></i> Kreator Populer</h3>
                    <span class="explore-count" id="exploreCount">${(topCreators || []).length} kreator</span>
                </div>
                <div id="exploreResults" class="explore-grid">
                    ${renderCreatorGrid(topCreators || [])}
                </div>
            </div>
        </div>
    `;
}

export async function searchPublicCreators(app) {
    const query = document.getElementById('exploreSearchQuery').value.trim();
    const resultsDiv = document.getElementById('exploreResults');
    const countEl = document.getElementById('exploreCount');
    
    if (!query) {
        const topCreators = await app.apiCall('explore.php', { action: 'get_top', limit: 10 });
        resultsDiv.innerHTML = renderCreatorGrid(topCreators || []);
        if (countEl) countEl.textContent = `${(topCreators || []).length} kreator`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px;"><div class="spinner" style="margin: 0 auto;"></div><p style="margin-top: 12px; color: var(--hint-color); font-size: 13px;">Mencari kreator...</p></div>';

    try {
        const results = await app.apiCall('explore.php', {
            action: 'search',
            query: query
        });

        resultsDiv.innerHTML = renderCreatorGrid(results || []);
        if (countEl) countEl.textContent = `${(results || []).length} hasil untuk "${query}"`;
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        resultsDiv.innerHTML = `<div class="card"><p style="color: var(--danger);">Error: ${error.message}</p></div>`;
    }
}

export function renderCreatorGrid(creators) {
    if (!creators || creators.length === 0) {
        return `
            <div class="explore-empty-state">
                <div class="explore-empty-icon">
                    <i data-lucide="user-search"></i>
                </div>
                <h4>Tidak ada kreator ditemukan</h4>
                <p>Coba kata kunci lain atau jelajahi kreator populer</p>
            </div>
        `;
    }

    return creators.map((c, index) => `
        <div class="explore-creator-card" style="animation-delay: ${index * 0.05}s">
            <div class="creator-card-left">
                <div class="creator-avatar ${c.is_verified ? 'verified' : ''}" ${c.photo_url ? 'style="font-size: 0;"' : ''}>
                    ${c.photo_url 
                        ? `<img src="${c.photo_url}" alt="${c.display_name}">` 
                        : (c.display_name || 'C').charAt(0).toUpperCase()
                    }
                    ${c.is_verified ? '<div class="creator-verified-tick"><i data-lucide="check" style="width:10px;height:10px;color:white"></i></div>' : ''}
                </div>
            </div>
            <div class="creator-card-info">
                <div class="creator-card-name">${c.display_name || 'Kreator'}</div>
                <div class="creator-card-username">@${c.username || 'user'}</div>
                <div class="creator-card-stats">
                    <span class="creator-stat-chip">
                        <i data-lucide="layers" style="width:11px;height:11px"></i>
                        ${c.total_media || 0} Konten
                    </span>
                </div>
            </div>
            <button class="creator-card-btn" onclick="app.viewPublicCreatorProfile(${c.user_id || c.id})">
                <i data-lucide="chevron-right"></i>
            </button>
        </div>
    `).join('');
}

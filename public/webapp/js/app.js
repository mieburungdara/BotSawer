import { apiCall } from './api.js';
import { formatCompactNumber, formatNumber, formatFileSize, getTierColor, getRelativeTime } from './utils.js';

// Page Modules
import { loadDashboard } from './pages/dashboard.js';
import { loadExplore, searchPublicCreators } from './pages/explore.js';
import { loadWallet, setupWithdrawalForm, setupTopupForm, calculateWithdrawalCommission } from './pages/wallet.js';
import { loadCreator, setupCreatorProfileForm, showGoalForm, hideGoalForm, saveGoal, deleteGoal } from './pages/creator.js';
import { loadContents } from './pages/contents.js';
import { loadAchievements } from './pages/achievements.js';
import { loadProfile, viewPublicCreatorProfile, viewOtherProfile, viewPublicCreatorProfileLink } from './pages/profile.js';
import { loadSettings, updateSetting } from './pages/settings.js';
import { 
    loadAdmin, searchUsers, toggleUserBan, adjustUserBalance, loadAuditLogs, loadBots, addBot, toggleBot,
    loadAdmins, addAdmin, deactivateAdmin, loadPendingPayments, approvePayment, rejectPayment, viewPaymentProof,
    loadContentQueue, approveContent, rejectContent, postContentToChannel, viewContent, loadCreators, verifyCreator, viewCreatorProfile,
    setupAdminFormHandlers
} from './pages/admin.js';

class App {
    constructor() {
        this.telegram = window.Telegram.WebApp;
        this.telegram.expand();
        this.botId = this.telegram.initDataUnsafe?.start_param || null;
        this.userData = null;
        this.currentPage = 'dashboard';
        this._creatorAnalytics = null; // Store for post-render chart init

        this.init();
    }

    // ------------------------------------------------------------------------
    // CORE SYSTEM & UTILS
    // ------------------------------------------------------------------------
    async apiCall(endpoint, data = {}) {
        return apiCall(this, endpoint, data);
    }
    
    formatCompactNumber(num) { return formatCompactNumber(num); }
    formatNumber(num) { return formatNumber(num); }
    formatFileSize(bytes) { return formatFileSize(bytes); }
    getTierColor(tier, isBg = false) { return getTierColor(tier, isBg); }
    getRelativeTime(dateString) { return getRelativeTime(dateString); }

    async init() {
        if (!this.botId) {
            // Check if URL has bot_id param (for local testing/direct webapp access without start_param)
            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.has('bot_id')) {
                this.botId = urlParams.get('bot_id');
            } else {
                document.getElementById('app').innerHTML = '<div class="card" style="margin: 20px;"><h3>Error</h3><p>Bot ID tidak ditemukan.</p></div>';
                return;
            }
        }

        try {
            const loadingHtml = '<div style="text-align: center; margin-top: 50px;"><div class="spinner" style="margin: 0 auto;"></div><p style="margin-top: 15px; color: var(--hint-color);">Memuat data...</p></div>';
            document.getElementById('app').innerHTML = loadingHtml;

            // Load user profile & session first
            await this.loadUserProfile();
            
            // Render main shell
            this.renderShell();
            
            // Set initial page from URL param
            const urlParams = new URLSearchParams(window.location.search);
            const startPage = urlParams.get('page');
            
            // Handle Telegram deep links via start_param
            const startParam = this.telegram.initDataUnsafe?.start_param;
            if (startParam) {
                if (startParam.startsWith('creator_')) {
                    const creatorId = startParam.replace('creator_', '');
                    this.viewPublicCreatorProfile(creatorId);
                    return;
                }
            }

            if (startPage) {
                this.loadPage(startPage);
            } else {
                this.loadPage('dashboard');
            }
        } catch (error) {
            console.error("Init Error:", error);
            document.getElementById('app').innerHTML = `<div class="card" style="margin: 20px;"><h3>Error</h3><p>${error.message}</p></div>`;
        }
    }

    async loadUserProfile() {
        try {
            this.userData = await this.apiCall('profile.php');
            
            if (this.userData.is_banned) {
                document.getElementById('app').innerHTML = `
                    <div style="padding: 20px; text-align: center;">
                        <i data-lucide="ban" style="width: 48px; height: 48px; color: var(--danger); margin-bottom: 10px;"></i>
                        <h2 style="color: var(--danger);">Akun Dibanned</h2>
                        <p style="color: var(--hint-color); margin-top: 10px;">
                            Akun Anda telah ditangguhkan karena melanggar ketentuan layanan kami.
                        </p>
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                throw new Error("Akun dibanned"); // Stop execution
            }

        } catch (error) {
            console.error('Failed to load profile:', error);
            throw error;
        }
    }

    renderShell() {
        const adminTab = this.userData.is_admin ? 
            `<div class="tab-item" onclick="app.loadPage('admin')" id="tab-admin">
                <i data-lucide="shield"></i>
                <span>Admin</span>
            </div>` : '';

        const shellHtml = `
            <!-- Header -->
            <header class="header">
                <div class="user-info">
                    <div class="avatar ${this.userData.is_verified ? 'verified' : ''}" onclick="app.loadPage('profile')" ${this.userData.photo_url ? 'style="font-size: 0;"' : ''}>
                        ${this.userData.photo_url 
                            ? `<img src="${this.userData.photo_url}" alt="Avatar">` 
                            : (this.userData.name || 'U').charAt(0).toUpperCase()}
                        ${this.userData.is_verified ? '<div class="verified-tick"><i data-lucide="check" style="width:8px;height:8px;color:white"></i></div>' : ''}
                    </div>
                    <div>
                        <div style="font-weight: 600;">${this.userData.name}</div>
                        <div style="font-size: 12px; color: var(--hint-color);">@${this.userData.username || 'user'}</div>
                    </div>
                </div>
                <div class="balance-badge" onclick="app.loadPage('wallet')">
                    Rp <span id="headerBalance">${this.formatCompactNumber(this.userData.balance)}</span>
                </div>
            </header>

            <!-- Main Content Area -->
            <main class="content-area" id="pageContent">
                <!-- Content injected here -->
            </main>

            <!-- Bottom Navigation Tab Bar -->
            <nav class="tab-bar">
                <div class="tab-item active" onclick="app.loadPage('dashboard')" id="tab-dashboard">
                    <i data-lucide="layout-dashboard"></i>
                    <span>Home</span>
                </div>
                <div class="tab-item" onclick="app.loadPage('explore')" id="tab-explore">
                    <i data-lucide="compass"></i>
                    <span>Explore</span>
                </div>
                <div class="tab-item" onclick="app.loadPage('wallet')" id="tab-wallet">
                    <i data-lucide="wallet"></i>
                    <span>Dompet</span>
                </div>
                <div class="tab-item" onclick="app.loadPage('creator')" id="tab-creator">
                    <i data-lucide="award"></i>
                    <span>Kreator</span>
                </div>
                ${adminTab}
            </nav>

            <!-- Modals -->
            <div id="proofModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center; padding: 20px;">
                <div style="background: var(--bg-color); border-radius: var(--radius-lg); max-width: 90%; max-height: 90%; overflow: hidden; position: relative; display: flex; flex-direction: column;">
                    <div style="padding: 15px; border-bottom: 1px solid var(--secondary-bg-color); display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">Bukti Transfer</h3>
                        <button onclick="app.closeProofModal()" style="background: none; border: none; color: var(--text-color); cursor: pointer;"><i data-lucide="x"></i></button>
                    </div>
                    <div style="padding: 20px; overflow-y: auto; text-align: center; position: relative; min-height: 200px; display: flex; justify-content: center; align-items: center;">
                        <div id="proofImageLoader" class="spinner"></div>
                        <img id="proofImage" src="" style="max-width: 100%; max-height: 70vh; border-radius: 8px; display: none;">
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app').innerHTML = shellHtml;
        if (window.lucide) window.lucide.createIcons();
    }

    async updateHeaderStats() {
        try {
            const data = await this.apiCall('profile.php');
            this.userData = data;
            document.getElementById('headerBalance').textContent = this.formatCompactNumber(data.balance);
        } catch (e) {
            console.error('Failed to update stats:', e);
        }
    }

    updateActiveTab(page) {
        document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
        const activeTab = document.getElementById(`tab-${page}`);
        if (activeTab) activeTab.classList.add('active');
    }

    // ------------------------------------------------------------------------
    // PAGE ROUTING & RENDERERS
    // ------------------------------------------------------------------------

    async loadPage(page, ...args) {
        this.currentPage = page;
        this.updateActiveTab(page);

        const contentDiv = document.getElementById('pageContent');
        contentDiv.innerHTML = '<div style="text-align: center; margin-top: 40px;"><div class="spinner" style="margin: 0 auto;"></div><p style="margin-top: 15px; color: var(--hint-color);">Memuat halaman...</p></div>';

        let html = '';
        try {
            switch(page) {
                case 'dashboard':
                    html = await loadDashboard(this);
                    break;
                case 'explore':
                    html = await loadExplore(this);
                    break;
                case 'wallet':
                    html = await loadWallet(this);
                    break;
                case 'creator':
                    html = await loadCreator(this);
                    break;
                case 'contents':
                    html = await loadContents(this, args[0] || 1);
                    break;
                case 'admin':
                    html = await loadAdmin(this);
                    break;
                case 'profile':
                    html = await loadProfile(this);
                    break;
                case 'achievements':
                    html = await loadAchievements(this);
                    break;
                default:
                    html = `<div class="card"><h3>Halaman tidak ditemukan</h3></div>`;
            }
        } catch (error) {
            console.error(`Error loading page ${page}:`, error);
            html = `<div class="card"><h3>Error</h3><p>${error.message}</p></div>`;
        }

        // Only update if we haven't navigated away
        if (this.currentPage === page && html) {
            contentDiv.innerHTML = html;
            if (window.lucide) window.lucide.createIcons();
            this.setupPageHandlers(page);
        }
    }

    setupPageHandlers(page) {
        if (page === 'wallet') {
            setupTopupForm(this);
            setupWithdrawalForm(this);
        } else if (page === 'creator') {
            setupCreatorProfileForm(this);
            
            // Wait for DOM to finish painting before rendering charts
            if (this._creatorAnalytics) {
                setTimeout(() => {
                    this.renderCreatorCharts(this._creatorAnalytics);
                }, 100);
            }
        } else if (page === 'admin') {
            setupAdminFormHandlers(this);
        }
    }

    // ------------------------------------------------------------------------
    // CHART RENDERING (Kept in app.js due to Chart.js global dependency)
    // ------------------------------------------------------------------------
    renderCreatorCharts(analytics) {
        if (!analytics) return;

        // Donations last 7 days chart
        const donationsCtx = document.getElementById('donationsChart');
        if (donationsCtx && analytics.donations_last_7_days && window.Chart) {
            new Chart(donationsCtx, {
                type: 'line',
                data: {
                    labels: analytics.donations_last_7_days.map(d => new Date(d.date).toLocaleDateString('id-ID')),
                    datasets: [{
                        label: 'Donasi (Rp)',
                        data: analytics.donations_last_7_days.map(d => d.amount),
                        borderColor: '#007aff',
                        backgroundColor: 'rgba(0, 122, 255, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'Rp ' + value.toLocaleString('id-ID');
                                }
                            }
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Donations by amount chart
        const amountCtx = document.getElementById('amountChart');
        if (amountCtx && analytics.donations_by_amount && window.Chart) {
            new Chart(amountCtx, {
                type: 'doughnut',
                data: {
                    labels: analytics.donations_by_amount.map(d => d.range),
                    datasets: [{
                        data: analytics.donations_by_amount.map(d => d.count),
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    }

    // ------------------------------------------------------------------------
    // EXPORTED DELEGATES FOR INLINE HTML (onclick="app.function()")
    // ------------------------------------------------------------------------
    searchPublicCreators() { return searchPublicCreators(this); }
    viewPublicCreatorProfile(userId) { return viewPublicCreatorProfile(this, userId); }
    viewPublicCreatorProfileLink(userId) { return viewPublicCreatorProfileLink(this, userId); }
    viewOtherProfile(userId) { return viewOtherProfile(this, userId); }
    
    // Creator Goals
    showGoalForm() { return showGoalForm(); }
    hideGoalForm() { return hideGoalForm(); }
    saveGoal() { return saveGoal(this); }
    deleteGoal(goalId) { return deleteGoal(this, goalId); }
    
    // Wallet
    calculateWithdrawalCommission() { return calculateWithdrawalCommission(); }
    
    // Admin features
    searchUsers() { return searchUsers(this); }
    toggleUserBan(userId, ban) { return toggleUserBan(this, userId, ban); }
    adjustUserBalance(userId, name) { return adjustUserBalance(this, userId, name); }
    loadAuditLogs() { return loadAuditLogs(this); }
    loadBots() { return loadBots(this); }
    addBot() { return addBot(this); }
    toggleBot(botId, active) { return toggleBot(this, botId, active); }
    loadAdmins() { return loadAdmins(this); }
    addAdmin() { return addAdmin(this); }
    deactivateAdmin(adminId) { return deactivateAdmin(this, adminId); }
    loadPendingPayments() { return loadPendingPayments(this); }
    approvePayment(paymentId, type) { return approvePayment(this, paymentId, type); }
    rejectPayment(paymentId, type) { return rejectPayment(this, paymentId, type); }
    viewPaymentProof(id) { return viewPaymentProof(this, id); }
    closeProofModal() { 
        const modal = document.getElementById('proofModal');
        if(modal) modal.style.display = 'none';
        const img = document.getElementById('proofImage');
        if(img) img.src = '';
    }
    loadContentQueue() { return loadContentQueue(this); }
    approveContent(contentId) { return approveContent(this, contentId); }
    rejectContent(contentId) { return rejectContent(this, contentId); }
    postContentToChannel(contentId) { return postContentToChannel(this, contentId); }
    viewContent(contentId) { return viewContent(this, contentId); }
    loadCreators() { return loadCreators(this); }
    verifyCreator(creatorId) { return verifyCreator(this, creatorId); }
    viewCreatorProfile(creatorId) { return viewCreatorProfile(this, creatorId); }
    loadSettings() { return loadSettings(this); }
    updateSetting(key) { return updateSetting(this, key); }
    
    // Pagination for contents
    loadContentsList(page) { this.loadPage('contents', page); }
}

// Initialize app when DOM is loaded and attach to window
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.app = new App();
    } catch (e) {
        console.error('Failed to initialize app:', e);
        document.getElementById('app').innerHTML = `
            <div class="card" style="margin:20px;">
                <h3>Error Inisialisasi</h3>
                <p>Gagal memuat aplikasi. Silakan refresh halaman.</p>
                <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top:10px;">
                    <i data-lucide="refresh-cw"></i> Refresh Halaman
                </button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    }
});

import { apiCall } from './api.js';
import { formatCompactNumber } from './utils.js';

// Page Modules
import { loadDashboard } from './pages/dashboard.js';
import { loadExplore, searchPublicCreators } from './pages/explore.js';
import { loadWallet, setupWithdrawalForm, setupTopupForm, calculateWithdrawalCommission } from './pages/wallet.js';
import { loadCreator, setupCreatorProfileForm, showGoalForm, hideGoalForm, saveGoal, deleteGoal } from './pages/creator.js';
import { loadContents } from './pages/contents.js';
import { loadAchievements } from './pages/achievements.js';
import { loadProfile, viewPublicCreatorProfile, viewOtherProfile, viewPublicCreatorProfileLink } from './pages/profile.js';
import { loadSettings, updateSetting } from './pages/settings.js';
import { loadInfo } from './pages/info.js';
import { loadHelp } from './pages/help.js';
import { loadBlog } from './pages/blog.js';
import { loadFaq } from './pages/faq.js';
import { loadBotsPage } from './pages/bots.js';
import { loadChannelsPage } from './pages/channels.js';
import { loadGroupsPage } from './pages/groups.js';
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
        this.userData = null;
        this.settings = null;
        this.currentPage = 'dashboard';
        this._creatorAnalytics = null;
        this._donationsChart = null;
        this._amountChart = null;
        
        // Parse ALL start params ONCE
        this.parseStartParams();

        this.init();
    }
    
    // ------------------------------------------------------------------------
    // START PARAM PARSER - SINGLE SOURCE OF TRUTH
    // ------------------------------------------------------------------------
    parseStartParams() {
        this.botId = null;
        this.startAction = null;
        this.startPayload = null;
        
        const urlParams = new URLSearchParams(window.location.search);
        
        // 1. Resolve start_param (from Telegram hash OR URL query)
        let startParam = this.telegram.initDataUnsafe ? this.telegram.initDataUnsafe.start_param : null;
        if (!startParam && urlParams.has('start_param')) {
            startParam = urlParams.get('start_param');
        }
        if (!startParam && urlParams.has('tgWebAppStartParam')) {
            startParam = urlParams.get('tgWebAppStartParam');
        }
        
        if (startParam) {
            if (startParam.startsWith('creator_')) {
                this.startAction = 'view_creator';
                this.startPayload = startParam.replace('creator_', '');
            } else if (startParam.startsWith('content_')) {
                this.startAction = 'view_content';
                this.startPayload = startParam.replace('content_', '');
            }
        }
        
        // 2. Resolve botId (from Telegram hash OR URL query OR fallback to startParam)
        const botIdFromTg = this.telegram.initDataUnsafe ? this.telegram.initDataUnsafe.bot_id : null;
        if (botIdFromTg) {
            this.botId = botIdFromTg;
        } else if (urlParams.has('bot_id')) {
            this.botId = urlParams.get('bot_id');
        } else if (startParam && !this.startAction) {
            // Fallback: only if it's not a deep link action
            this.botId = startParam;
        }
        
        console.log('App: Bot ID resolved as:', this.botId);
        console.log('App: Start Action:', this.startAction, 'Payload:', this.startPayload);
    }

    // ------------------------------------------------------------------------
    // CORE SYSTEM & UTILS
    // ------------------------------------------------------------------------
    async apiCall(endpoint, data = {}) {
        return apiCall(this, endpoint, data);
    }

    async init() {
        if (!this.botId) {
            document.getElementById('app').innerHTML = `
                <div class="card" style="margin: 20px; text-align: center;">
                    <i data-lucide="shield-alert" style="width: 48px; height: 48px; color: var(--danger); margin-bottom: 15px;"></i>
                    <h3>🚫 Akses Tidak Valid</h3>
                    <p style="color: var(--hint-color); margin-top: 10px;">
                        Aplikasi ini memerlukan identifikasi bot yang valid.<br>
                        Silakan buka melalui bot resmi.
                    </p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        try {
            const loadingHtml = '<div style="text-align: center; margin-top: 50px;"><div class="spinner" style="margin: 0 auto;"></div><p style="margin-top: 15px; color: var(--hint-color);">Memuat data...</p></div>';
            document.getElementById('app').innerHTML = loadingHtml;

            // Load settings & user profile first
            await this.loadAppSettings();
            await this.loadUserProfile();
            
            // Render main shell
            this.renderShell();
            
            // Handle deep link actions first
            if (this.startAction === 'view_creator') {
                this.currentPage = 'profile';
                this.updateActiveTab('profile');
                this.viewPublicCreatorProfile(this.startPayload);
                return;
            } else if (this.startAction === 'view_content') {
                // Navigate to content management or detail
                // For now, let's load 'contents' page with specific media if supported, 
                // or just go to contents page.
                this.loadPage('contents', 1, this.startPayload);
                return;
            }
            
            // Set initial page from URL param
            const urlParams = new URLSearchParams(window.location.search);
            const startPage = urlParams.get('page');

            if (startPage) {
                this.loadPage(startPage);
            } else {
                this.loadPage('dashboard');
            }
        } catch (error) {
            console.error("Init Error:", error);
            document.getElementById('app').innerHTML = `
                <div class="card" style="margin: 20px; text-align: center;">
                    <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--danger); margin-bottom: 15px;"></i>
                    <h3>Gagal Memuat</h3>
                    <p style="color: var(--hint-color); margin-top: 10px;">${error.message}</p>
                    <button class="btn btn-secondary mt-4" onclick="window.location.reload()">
                        <i data-lucide="refresh-cw"></i> Coba Lagi
                    </button>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    }

    async loadAppSettings() {
        const CACHE_KEY = 'vesper_app_settings';
        const CACHE_EXPIRY = 3600000; // 1 hour

        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
                this.settings = data;
                console.log('App: Settings loaded from cache');
                return;
            }
        }

        try {
            // We use a simplified apiCall that doesn't need auth for config
            const response = await fetch(`api/config.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botId: this.botId })
            });
            const result = await response.json();
            if (result.success) {
                this.settings = result.data;
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: result.data,
                    timestamp: Date.now()
                }));
                console.log('App: Settings loaded from API');
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            // Fallback
            this.settings = { app_name: 'Vesper', app_version: '1.0.0' };
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
            `<button class="nav-btn" data-page="admin">
                <i data-lucide="shield-check"></i>
                Admin
            </button>` : '';
        
        const creatorTabs = this.userData.is_creator ? 
            `<button class="nav-btn" data-page="contents">
                <i data-lucide="layers"></i>
                Konten
            </button>
            <button class="nav-btn" data-page="creator">
                <i data-lucide="bar-chart-3"></i>
                Statistik
            </button>` : '';

        const shellHtml = `
            <!-- Header -->
            <header class="app-header">
                <!-- Animated mesh background -->
                <div class="header-mesh"></div>
                <div class="header-particles">
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                </div>

                <div class="header-top-bar">
                    <div class="brand">
                        <div class="brand-icon">
                            <i data-lucide="zap"></i>
                        </div>
                        <h1>${this.settings.app_name}</h1>
                    </div>
                    <div class="header-actions">
                        <button class="header-icon-btn" onclick="app.toggleSidebar()" title="Menu">
                            <i data-lucide="menu"></i>
                        </button>
                    </div>
                </div>

                <div class="header-profile-section">
                    <div class="header-avatar-ring">
                        <div class="avatar-circle ${this.userData.is_verified ? 'verified' : ''}" onclick="app.loadPage('profile')" ${this.userData.photo_url ? 'style="font-size: 0;"' : ''}>
                            ${this.userData.photo_url 
                                ? `<img src="${this.userData.photo_url}" alt="Avatar">` 
                                : (this.userData.name || 'U').charAt(0).toUpperCase()}
                            ${this.userData.is_verified ? '<div class="verified-tick"><i data-lucide="check" style="width:8px;height:8px;color:white"></i></div>' : ''}
                        </div>
                        <div class="avatar-status-dot"></div>
                    </div>
                    <div class="header-greeting">
                        <span class="greeting-label" id="greetingText">Selamat datang 👋</span>
                        <span id="userName" class="name-display">${this.userData.name}</span>
                        <div id="userBadge" class="badge-container"></div>
                    </div>
                </div>

                <div class="header-balance-card">
                    <div class="balance-card-bg"></div>
                    <div class="balance-card-content">
                        <div class="balance-left">
                            <div class="balance-icon-wrap">
                                <i data-lucide="wallet"></i>
                            </div>
                            <div class="balance-info">
                                <span class="balance-label">Saldo Tersedia</span>
                                <span id="h-balance" class="balance-value">Rp ${formatCompactNumber(this.userData.balance)}</span>
                            </div>
                        </div>
                        <button class="balance-topup-btn" onclick="app.loadPage('wallet')">
                            <i data-lucide="plus"></i>
                        </button>
                    </div>
                </div>

                <!-- Wave cut bottom -->
                <div class="header-wave">
                    <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
                        <path d="M0,0 C360,60 1080,0 1440,50 L1440,60 L0,60 Z" fill="var(--secondary-bg-color)"/>
                    </svg>
                </div>
            </header>

            <nav class="app-nav">
                <button class="nav-btn active" data-page="dashboard">
                    <i data-lucide="layout-dashboard"></i>
                    Dashboard
                </button>
                <button class="nav-btn" data-page="explore">
                    <i data-lucide="search"></i>
                    Cari
                </button>
            </nav>

            <!-- Sidebar / Side Drawer -->
            <div id="sideDrawer" class="side-drawer">
                <div class="drawer-overlay" onclick="app.toggleSidebar()"></div>
                <div class="drawer-content">
                    <div class="drawer-header">
                        <div class="drawer-user">
                            <div class="drawer-avatar">
                                ${this.userData.photo_url 
                                    ? `<img src="${this.userData.photo_url}" alt="Avatar">` 
                                    : (this.userData.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div class="drawer-info">
                                <span class="drawer-name">${this.userData.name}</span>
                                <span class="drawer-status">${this.userData.is_verified ? 'Kreator Terverifikasi' : 'Donatur'}</span>
                            </div>
                        </div>
                        <button class="drawer-close" onclick="app.toggleSidebar()">
                            <i data-lucide="x"></i>
                        </button>
                    </div>

                    <div class="drawer-menu">
                        <div class="menu-section">UTAMA</div>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('dashboard'); app.toggleSidebar();">
                            <i data-lucide="layout-dashboard"></i> Dashboard
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('explore'); app.toggleSidebar();">
                            <i data-lucide="search"></i> Cari Kreator
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('wallet'); app.toggleSidebar();">
                            <i data-lucide="wallet"></i> Dompet Saya
                        </a>

                        <div class="menu-section">KREATOR</div>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('contents'); app.toggleSidebar();">
                            <i data-lucide="layers"></i> Kelola Konten
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('creator'); app.toggleSidebar();">
                            <i data-lucide="bar-chart-3"></i> Statistik & Goal
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('profile'); app.toggleSidebar();">
                            <i data-lucide="user"></i> Profil Publik
                        </a>

                        <div class="menu-section">LAINNYA</div>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('achievements'); app.toggleSidebar();">
                            <i data-lucide="award"></i> Pencapaian
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('settings'); app.toggleSidebar();">
                            <i data-lucide="settings"></i> Pengaturan
                        </a>

                        <div class="menu-section">INFORMASI & BANTUAN</div>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('info'); app.toggleSidebar();">
                            <i data-lucide="info"></i> Informasi Bot
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('help'); app.toggleSidebar();">
                            <i data-lucide="help-circle"></i> Panduan Pengguna
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('faq'); app.toggleSidebar();">
                            <i data-lucide="message-circle"></i> Tanya Jawab (FAQ)
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('blog'); app.toggleSidebar();">
                            <i data-lucide="book-open"></i> Blog & Berita
                        </a>

                        <div class="menu-section">EKOSISTEM</div>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('bots'); app.toggleSidebar();">
                            <i data-lucide="bot"></i> Daftar Bot
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('channels'); app.toggleSidebar();">
                            <i data-lucide="megaphone"></i> Channel Pilihan
                        </a>
                        <a href="javascript:void(0)" class="menu-item" onclick="app.loadPage('groups'); app.toggleSidebar();">
                            <i data-lucide="users"></i> Grup Komunitas
                        </a>

                        ${this.userData.is_admin ? `
                        <div class="menu-section admin-section">ADMINISTRATOR</div>
                        <a href="javascript:void(0)" class="menu-item admin-item" onclick="app.loadPage('admin'); app.toggleSidebar();">
                            <i data-lucide="shield-check"></i> Admin Panel
                        </a>
                        ` : ''}
                    </div>

                    <div class="drawer-footer">
                        <span>${this.settings.app_name} v${this.settings.app_version}</span>
                    </div>
                </div>
            </div>

            <!-- Main Content Area -->
            <main class="app-content" id="pageContent">
                <!-- Content injected here -->
            </main>

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

        // ✅ MASUKKAN HTML KE DOM TERLEBIH DAHULU SEBELUM MODIFIKASI APAPUN
        document.getElementById('app').innerHTML = shellHtml;

        // Dynamic greeting based on time of day
        const hour = new Date().getHours();
        let greetEmoji = '👋';
        let greetText = 'Selamat datang';
        if (hour >= 5 && hour < 12) { greetText = 'Selamat pagi'; greetEmoji = '☀️'; }
        else if (hour >= 12 && hour < 15) { greetText = 'Selamat siang'; greetEmoji = '🌤️'; }
        else if (hour >= 15 && hour < 18) { greetText = 'Selamat sore'; greetEmoji = '🌅'; }
        else if (hour >= 18 || hour < 5) { greetText = 'Selamat malam'; greetEmoji = '🌙'; }
        
        document.getElementById('greetingText').textContent = `${greetText} ${greetEmoji}`;

        // Generate Avatar Initials or Photo
        if (this.userData.photo_url) {
            document.querySelector('.avatar-circle').innerHTML = `<img src="${this.userData.photo_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            document.querySelector('.avatar-circle').style.fontSize = '0';
        }

        // Render Badges
        const badgeContainer = document.getElementById('userBadge');
        badgeContainer.innerHTML = ''; // Clear

            if (this.userData.has_posted) {
                badgeContainer.innerHTML += '<span class="status-badge creator"><i data-lucide="award"></i> Kreator</span>';
            }
            if (this.userData.has_donated) {
                badgeContainer.innerHTML += '<span class="status-badge" style="color: var(--primary); border-color: var(--primary);"><i data-lucide="heart"></i> Donatur</span>';
            }
        
        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Setup navigation click handlers - RUN ONLY ONCE
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.loadPage(page);
            });
        });
    }

    async updateHeaderStats() {
        try {
            const data = await this.apiCall('profile.php');
            this.userData = data;
            const balanceEl = document.getElementById('h-balance');
            if (balanceEl) {
                balanceEl.textContent = 'Rp ' + formatCompactNumber(data.balance);
            }
        } catch (e) {
            console.error('Failed to update stats:', e);
        }
    }

    updateActiveTab(page) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
    }

    // ------------------------------------------------------------------------
    // PAGE ROUTING & RENDERERS
    // ------------------------------------------------------------------------

    async loadPage(page, ...args) {
        this.currentPage = page;
        this.updateActiveTab(page);
        
        // Reset creator analytics state when navigating away from creator page
        if (page !== 'creator') {
            this._creatorAnalytics = null;
        }

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
                case 'info':
                    html = await loadInfo(this);
                    break;
                case 'help':
                    html = await loadHelp(this);
                    break;
                case 'blog':
                    html = await loadBlog(this);
                    break;
                case 'faq':
                    html = await loadFaq(this);
                    break;
                case 'bots':
                    html = await loadBotsPage(this);
                    break;
                case 'channels':
                    html = await loadChannelsPage(this);
                    break;
                case 'groups':
                    html = await loadGroupsPage(this);
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
            this.setupPageHandlers(page, args[2] || null); // Pass highlightId
        }
    }

    setupPageHandlers(page, highlightId = null) {
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
        } else if (page === 'contents') {
            if (highlightId) {
                this.handleDraftConfirmation(highlightId);
            }
        }
    }

    async handleDraftConfirmation(shortId) {
        // Try to find the row
        const row = document.getElementById(`media-${shortId}`);
        if (!row) return;

        // Check if it's a draft
        if (row.dataset.status === 'draft') {
            this.telegram.showConfirm(`Konfirmasi Konten #${shortId}?\n\nKonten ini masih berstatus DRAFT. Klik OK untuk memasukkan ke antrean posting.`, async (ok) => {
                if (ok) {
                    try {
                        const res = await this.apiCall('creator.php', {
                            action: 'confirm_content',
                            contentId: shortId
                        });
                        
                        if (res.success) {
                            this.telegram.showAlert('Konten berhasil dikonfirmasi!');
                            this.loadPage('contents'); 
                        }
                    } catch (e) {
                        this.telegram.showAlert('Gagal konfirmasi: ' + e.message);
                    }
                }
            });
        }
    }

    // ------------------------------------------------------------------------
    // CHART RENDERING (Kept in app.js due to Chart.js global dependency)
    // TODO (OPT): Pindahkan logika ini ke creator.js untuk mengurangi coupling
    // ------------------------------------------------------------------------
    renderCreatorCharts(analytics) {
        if (!analytics) return;

        // Destroy existing chart instances first to prevent "Canvas already in use" error
        if (this._donationsChart) {
            this._donationsChart.destroy();
            this._donationsChart = null;
        }
        if (this._amountChart) {
            this._amountChart.destroy();
            this._amountChart = null;
        }

        // Donations last 7 days chart
        const donationsCtx = document.getElementById('donationsChart');
        if (donationsCtx && analytics.donations_last_7_days && window.Chart) {
            this._donationsChart = new Chart(donationsCtx, {
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
                    maintainAspectRatio: false,
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
            this._amountChart = new Chart(amountCtx, {
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
                    maintainAspectRatio: false,
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
    calculateWithdrawalCommission() { return calculateWithdrawalCommission(this); }
    
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
    loadCreators() { return loadCreators(this); }
    verifyCreator(creatorId) { return verifyCreator(this, creatorId); }
    viewCreatorProfile(creatorId) { return viewCreatorProfile(this, creatorId); }
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
    loadSettings() { return loadSettings(this); }
    updateSetting(key) { return updateSetting(this, key); }
    
    toggleSidebar() {
        const drawer = document.getElementById('sideDrawer');
        if (drawer) {
            drawer.classList.toggle('active');
            // Prevent scrolling when sidebar is open
            document.body.style.overflow = drawer.classList.contains('active') ? 'hidden' : '';
        }
    }
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

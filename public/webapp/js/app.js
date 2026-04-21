// Main App JavaScript
class App {
    constructor() {
        this.telegram = new TelegramWebApp();
        this.currentPage = 'dashboard';
        this.userData = null;
        // Get bot_id from URL parameter (should be Telegram bot ID)
        const urlParams = new URLSearchParams(window.location.search);
        this.botId = urlParams.get('bot_id') || null; // null if not specified
        this.init();
    }

    async init() {
        // Hide loading
        document.getElementById('loading').style.display = 'none';

        // Check authentication
        if (!this.telegram.isValid()) {
            document.getElementById('authError').style.display = 'block';
            return;
        }

        // Authenticate with server
        try {
            const response = await this.apiCall('auth.php', {
                initData: this.telegram.getInitData()
            });

            if (response) {
                this.userData = response;
                this.showMainApp();
                await this.updateHeaderStats();
                this.loadPage('dashboard');
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.telegram.showAlert('Gagal mengautentikasi: ' + error.message);
            document.getElementById('authError').style.display = 'block';
        }
    }

    async updateHeaderStats() {
        try {
            const walletData = await this.apiCall('wallet.php');
            document.getElementById('h-balance').textContent = 'Rp ' + this.formatCompactNumber(walletData.balance || 0);
            
            if (window.lucide) window.lucide.createIcons();
        } catch (e) {
            console.error('Failed to update header stats:', e);
        }
    }

    formatCompactNumber(number) {
        if (number < 1000) return number;
        if (number >= 1000 && number < 1000000) return (number / 1000).toFixed(number % 1000 !== 0 ? 1 : 0) + 'rb';
        if (number >= 1000000 && number < 1000000000) return (number / 1000000).toFixed(number % 1000000 !== 0 ? 1 : 0) + 'jt';
        return (number / 1000000000).toFixed(number % 1000000000 !== 0 ? 1 : 0) + 'M';
    }

    showMainApp() {
        document.getElementById('mainApp').style.display = 'block';

        // Initialize Lucide icons for static elements (nav)
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Update user info & profile display
        const firstName = this.userData.first_name || '';
        const lastName = this.userData.last_name || '';
        const userName = firstName + (lastName ? ' ' + lastName : '');
        document.getElementById('userName').textContent = userName;

        // Generate Avatar Initials
        const initials = (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase();
        document.getElementById('userAvatar').textContent = initials;

        // Render Badges
        const badgeContainer = document.getElementById('userBadge');
        badgeContainer.innerHTML = ''; // Clear

        if (this.userData.is_creator) {
            badgeContainer.innerHTML += '<span class="status-badge creator"><i data-lucide="award"></i> Creator</span>';
        }
        if (this.userData.is_admin) {
            badgeContainer.innerHTML += '<span class="status-badge admin"><i data-lucide="shield"></i> Admin</span>';
        }

        // Show admin buttons if admin
        if (this.userData.is_admin) {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
        }

        // Show creator buttons if creator
        if (this.userData.is_creator) {
            document.querySelectorAll('.creator-only').forEach(el => el.style.display = 'flex');
        }

        // Initialize Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Setup navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.loadPage(page);
            });
        });

        // Setup form handlers
        this.setupFormHandlers();

        // Setup withdrawal form handler
        this.setupWithdrawalForm();

        // Setup creator profile form handler
        this.setupCreatorProfileForm();
    }

    async loadPage(pageName) {
        this.currentPage = pageName;

        // Update active nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });

        const content = document.getElementById('pageContent');

        try {
            let html = '';

            switch (pageName) {
                case 'dashboard':
                    html = await this.loadDashboard();
                    break;
                case 'explore':
                    html = await this.loadExplore();
                    break;
                case 'wallet':
                    html = await this.loadWallet();
                    break;
                case 'creator':
                    html = await this.loadCreator();
                    break;
                case 'contents':
                    html = await this.loadContents();
                    break;
                case 'admin':
                    html = await this.loadAdmin();
                    break;
                default:
                    html = '<div class="card"><h3>Halaman tidak ditemukan</h3></div>';
            }

            content.innerHTML = html;

            // Re-initialize Lucide icons
            if (window.lucide) {
                window.lucide.createIcons();
            }

            // Re-attach event listeners for dynamic forms
            this.setupFormHandlers();
            this.setupWithdrawalForm();
            this.setupTopupForm();
            this.setupCreatorProfileForm();

            // Initialize charts after DOM update for creator page
            if (pageName === 'creator' && this._creatorAnalytics) {
                this.renderCreatorCharts(this._creatorAnalytics);
                this._creatorAnalytics = null;
            }
        } catch (error) {
            console.error('Load page error:', error);
            content.innerHTML = '<div class="card"><h3>Error</h3><p>Gagal memuat halaman</p></div>';
        }
    }

    async loadDashboard() {
        return `
            <div class="grid-layout fade-in">
                <div class="card">
                    <h3><i data-lucide="sparkles"></i> Selamat Datang!</h3>
                    <p style="color: var(--hint-color); font-size: 14px;">Gunakan menu di bawah untuk mengelola saldo, melihat statistik, atau mengatur konten Anda.</p>
                </div>
            </div>
        `;
    }

    async loadWallet() {
        const walletData = await this.apiCall('wallet.php');
        const transactions = await this.apiCall('transactions.php');

        let tableRows = '';
        if (transactions && transactions.length > 0) {
            transactions.forEach(tx => {
                const statusClass = tx.status === 'success' ? 'status-success' :
                                  tx.status === 'pending' ? 'status-pending' : 'status-failed';
                const iconColor = tx.amount > 0 ? 'var(--success)' : 'var(--danger)';

                tableRows += `
                    <tr>
                        <td>
                            <div style="font-size: 11px; color: var(--hint-color);">${new Date(tx.created_at).toLocaleDateString('id-ID')}</div>
                        </td>
                        <td>
                            <div style="font-weight: 600; font-size: 13px;">${tx.description}</div>
                        </td>
                        <td style="text-align: right;">
                            <div style="font-weight: 700; color: ${iconColor}; white-space: nowrap;">
                                ${tx.amount > 0 ? '+' : ''}${this.formatNumber(tx.amount)}
                            </div>
                        </td>
                        <td style="text-align: right;">
                            <span class="status-badge ${statusClass}" style="font-size: 10px; padding: 2px 6px;">${tx.status}</span>
                        </td>
                    </tr>
                `;
            });
        } else {
            tableRows = '<tr><td colspan="4" class="text-center">Belum ada transaksi</td></tr>';
        }

        return `
            <div class="grid-layout fade-in">
                <div class="card">
                    <h3><i data-lucide="credit-card"></i> Detail Saldo</h3>
                    <div style="padding: 12px; background: var(--secondary-bg-color); border-radius: var(--radius-md); margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: var(--hint-color);">Saldo Tersedia</span>
                            <span style="font-weight: 700; color: var(--primary);">Rp ${this.formatNumber(walletData.balance || 0)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--hint-color);">Total Transaksi</span>
                            <span style="font-weight: 600;">${(walletData.total_donations || 0)} Trx</span>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3><i data-lucide="plus-circle"></i> Isi Saldo (Topup)</h3>
                    <form id="topupForm">
                        <div class="form-group">
                            <label>Nominal Topup</label>
                            <input type="number" id="topupAmount" min="10000" step="1000" placeholder="Min. Rp 10.000" required>
                        </div>
                        <button type="submit" class="btn btn-success">
                            <i data-lucide="send"></i> Ajukan Topup
                        </button>
                    </form>
                </div>

                <div class="card">
                    <h3><i data-lucide="arrow-up-right"></i> Tarik Saldo</h3>
                    <div style="background: rgba(99, 102, 241, 0.05); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px dashed var(--primary);">
                        <div style="display: flex; gap: 10px; color: var(--primary);">
                            <i data-lucide="info" style="flex-shrink: 0;"></i>
                            <p style="font-size: 13px; font-weight: 500;">Biaya komisi: <strong>10%</strong>.</p>
                        </div>
                    </div>
                    <form id="withdrawForm">
                        <div class="form-group">
                            <label>Nominal Penarikan</label>
                            <input type="number" id="withdrawAmount" min="50000" step="1000" placeholder="Min. Rp 50.000" required>
                        </div>
                        <div class="form-group">
                            <label>Pilih E-Wallet</label>
                            <select id="bankName" required>
                                <option value="">Pilih...</option>
                                <option value="ShopeePay">ShopeePay</option>
                                <option value="DANA">DANA</option>
                                <option value="GoPay">GoPay</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Nomor Handphone</label>
                            <input type="text" id="bankAccount" placeholder="Contoh: 0812..." required>
                        </div>
                        <div class="form-group">
                            <label>Nama Akun</label>
                            <input type="text" id="accountName" placeholder="Nama sesuai aplikasi" required>
                        </div>
                        <button type="submit" class="btn btn-primary">
                            <i data-lucide="arrow-up-right"></i> Tarik Sekarang
                        </button>
                    </form>
                </div>

                <div class="card col-full">
                    <h3><i data-lucide="history"></i> Riwayat Transaksi</h3>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Tanggal</th>
                                    <th>Deskripsi</th>
                                    <th style="text-align: right;">Jumlah</th>
                                    <th style="text-align: right;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    async loadCreator() {
        if (!this.userData.is_creator) {
            return '<div class="card"><h3><i data-lucide="alert-circle"></i> Akses Ditolak</h3><p>Anda bukan kreator terverifikasi</p></div>';
        }

        const creatorData = await this.apiCall('creator.php');
        const transactions = await this.apiCall('transactions.php');

        let tableRows = '';
        if (transactions && transactions.length > 0) {
            transactions.forEach(tx => {
                // ... (rest of implementation)
            });
        }
    }

    async loadContents(page = 1) {
        if (!this.userData.is_creator) {
            return '<div class="card"><h3>Akses Ditolak</h3></div>';
        }

        const response = await this.apiCall('creator.php', { page: page, limit: 10 });
        const contents = response.recent_content || [];
        const paging = response.pagination;

        let tableRows = '';
        if (contents.length > 0) {
            contents.forEach(item => {
                tableRows += `
                    <tr>
                        <td>
                            <div style="font-weight: 600;">Media #${item.id}</div>
                            <div style="font-size: 11px; color: var(--hint-color);">${new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                        </td>
                        <td>${item.file_type}</td>
                        <td style="text-align: right;">
                            <div style="font-weight: 700; color: var(--success);">Rp ${this.formatNumber(item.total_donations)}</div>
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
        if (paging.total_pages > 1) {
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

        if (this.currentPage === 'contents') {
            document.getElementById('pageContent').innerHTML = html;
            if (window.lucide) window.lucide.createIcons();
        }
        return html;
    }

    async loadAdmin() {
        if (!this.userData.is_admin) {
            return '<div class="card"><h3>Akses Ditolak</h3><p>Anda bukan admin</p></div>';
        }

        const adminRole = this.userData.admin_role;
        const adminData = await this.apiCall('admin.php', { action: 'stats' });

        let html = '';

        // Statistik Sistem
        html += `
            <div class="card">
                <h3><i data-lucide="activity"></i> Statistik Sistem</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 10px;">
                    <div style="background: var(--secondary-bg-color); padding: 16px; border-radius: var(--radius-md);">
                        <div style="font-size: 12px; color: var(--hint-color); font-weight: 600;">TOTAL USER</div>
                        <div style="font-size: 20px; font-weight: 700;">${adminData.total_users || 0}</div>
                    </div>
                    <div style="background: var(--secondary-bg-color); padding: 16px; border-radius: var(--radius-md);">
                        <div style="font-size: 12px; color: var(--hint-color); font-weight: 600;">TOTAL TRX</div>
                        <div style="font-size: 20px; font-weight: 700;">${adminData.total_transactions || 0}</div>
                    </div>
                    <div style="grid-column: span 2; background: var(--secondary-bg-color); padding: 16px; border-radius: var(--radius-md);">
                        <div style="font-size: 12px; color: var(--hint-color); font-weight: 600;">SALDO SISTEM</div>
                        <div style="font-size: 20px; font-weight: 700; color: var(--primary);">Rp ${this.formatNumber(adminData.total_balance || 0)}</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3><i data-lucide="scroll-text"></i> Audit Logs</h3>
                <div class="form-group">
                    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                        <select id="auditEntityType" style="flex: 1;">
                            <option value="">Tipe Log</option>
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                            <option value="creator">Creator</option>
                        </select>
                        <input type="number" id="auditUserId" placeholder="User ID" style="flex: 1;">
                    </div>
                    <button class="btn btn-secondary" onclick="app.loadAuditLogs()">
                        <i data-lucide="refresh-cw"></i> Load Logs
                    </button>
                </div>
                <div id="auditLogsContainer"></div>
            </div>
        `;

        // Finance admin sections
        if (adminRole === 'finance' || adminRole === 'super_admin') {
            html += `
                <div class="card">
                    <h3>💰 Payment Management</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div style="text-align: center; padding: 15px; background: #fff3cd; border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: #856404;">${adminData.pending_topups || 0}</div>
                            <div style="font-size: 12px; color: #856404;">Topup Pending</div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: #d1ecf1; border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: #0c5460;">${adminData.pending_withdrawals || 0}</div>
                            <div style="font-size: 12px; color: #0c5460;">Penarikan Pending</div>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="app.loadPendingPayments()">Kelola Pembayaran</button>
                    <div id="paymentContainer" style="margin-top: 15px;"></div>
                </div>
            `;
        }

        // Moderator admin sections
        if (adminRole === 'moderator' || adminRole === 'super_admin') {
            html += `
                <div class="card">
                    <h3>🔧 Content Moderation</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div style="text-align: center; padding: 15px; background: #f8d7da; border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: #721c24;">${adminData.pending_content || 0}</div>
                            <div style="font-size: 12px; color: #721c24;">Konten Pending</div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: #d4edda; border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: #155724;">${adminData.approved_today || 0}</div>
                            <div style="font-size: 12px; color: #155724;">Disetujui Hari Ini</div>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="app.loadContentQueue()">Kelola Konten</button>
                    <div id="contentContainer" style="margin-top: 15px;"></div>
                </div>

                <div class="card">
                    <h3>Creator Management</h3>
                    <button class="btn btn-secondary" onclick="app.loadCreators()">Load Creators</button>
                    <div id="creatorsContainer" style="margin-top: 15px;"></div>
                </div>
            `;
        }

        // Super admin only sections
        if (adminRole === 'super_admin') {
            html += `
                <div class="card">
                    <h3>Cari User</h3>
                    <div class="form-group">
                        <input type="text" id="userSearchQuery" placeholder="Cari nama atau username..." style="margin-bottom: 10px;">
                        <button class="btn btn-secondary" onclick="app.searchUsers()">Cari</button>
                    </div>
                    <div id="userSearchResults"></div>
                </div>

                <div class="card">
                    <h3>Manajemen Saldo</h3>
                    <form id="adjustBalanceForm">
                        <div class="form-group">
                            <label>User ID</label>
                            <input type="number" id="adjustUserId" required>
                        </div>
                        <div class="form-group">
                            <label>Jumlah (positif = tambah, negatif = kurang)</label>
                            <input type="number" id="adjustAmount" step="1000" required>
                        </div>
                        <div class="form-group">
                            <label>Deskripsi</label>
                            <input type="text" id="adjustDescription" required>
                        </div>
                        <button type="submit" class="btn btn-danger">Sesuaikan Saldo</button>
                    </form>
                    <div id="adjustResult" style="margin-top: 10px;"></div>
                </div>

                <div class="card">
                    <h3>Pengaturan Sistem</h3>
                    <button class="btn btn-secondary" onclick="app.loadSettings()">Load Settings</button>
                    <div id="settingsContainer" style="margin-top: 15px;"></div>
                </div>

                <div class="card">
                    <h3>Bot Management</h3>
                    <button class="btn btn-secondary" onclick="app.loadBots()">Load Bots</button>
                    <div id="botsContainer" style="margin-top: 15px;"></div>
                    <div id="addBotForm" style="margin-top: 15px; display: none;">
                        <h4>Add New Bot</h4>
                        <div class="form-group">
                            <label>Bot Name</label>
                            <input type="text" id="botName" required>
                        </div>
                        <div class="form-group">
                            <label>Username (without @)</label>
                            <input type="text" id="botUsername" required>
                        </div>
                        <div class="form-group">
                            <label>Bot Token</label>
                            <input type="text" id="botToken" required>
                        </div>
                        <div class="form-group">
                            <label>Webhook Secret (optional)</label>
                            <input type="text" id="botWebhookSecret">
                        </div>
                        <button type="submit" class="btn btn-primary" onclick="app.addBot()">Add Bot</button>
                        <button class="btn btn-secondary" onclick="document.getElementById('addBotForm').style.display='none'">Cancel</button>
                    </div>
                </div>

                <div class="card">
                    <h3>Admin Management</h3>
                    <button class="btn btn-secondary" onclick="app.loadAdmins()">Load Admins</button>
                    <div id="adminsContainer" style="margin-top: 15px;"></div>
                    <div id="addAdminForm" style="margin-top: 15px; display: none;">
                        <h4>Add New Admin</h4>
                        <div class="form-group">
                            <label>Telegram ID</label>
                            <input type="number" id="adminTelegramId" placeholder="Contoh: 123456789" required>
                        </div>
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="adminUsername" placeholder="@username" required>
                        </div>
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" id="adminFullName" placeholder="Nama Lengkap" required>
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <select id="adminRole" required>
                                <option value="">Select Role</option>
                                <option value="moderator">Moderator (Content Management)</option>
                                <option value="finance">Finance (Payment Management)</option>
                                <option value="super_admin">Super Admin (Full Access)</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary" onclick="app.addAdmin()">Add Admin</button>
                        <button class="btn btn-secondary" onclick="document.getElementById('addAdminForm').style.display='none'">Cancel</button>
                    </div>
                </div>
            `;
        }

        return `<div class="grid-layout fade-in">${html}</div>`;
    }

    async loadExplore() {
        const topCreators = await this.apiCall('explore.php', { action: 'get_top', limit: 10 });

        return `
            <div class="grid-layout fade-in">
                <div class="card col-full">
                    <h3><i data-lucide="search"></i> Cari Kreator</h3>
                    <p style="font-size: 13px; color: var(--hint-color); margin-bottom: 15px;">Temukan kreator favoritmu dan berikan dukungan!</p>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="exploreSearchQuery" placeholder="Nama atau username..." style="flex: 1;">
                        <button class="btn btn-primary" onclick="app.searchPublicCreators()" style="width: auto;">
                            <i data-lucide="search"></i>
                        </button>
                    </div>
                </div>

                <div id="exploreResults" class="col-full" style="display: grid; grid-template-columns: 1fr; gap: 16px;">
                    ${this.renderCreatorGrid(topCreators || [])}
                </div>
            </div>
        `;
    }

    async searchPublicCreators() {
        const query = document.getElementById('exploreSearchQuery').value.trim();
        const resultsDiv = document.getElementById('exploreResults');
        
        if (!query) {
            // Load top creators if query is empty
            const topCreators = await this.apiCall('explore.php', { action: 'get_top', limit: 10 });
            resultsDiv.innerHTML = this.renderCreatorGrid(topCreators || []);
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        resultsDiv.innerHTML = '<div class="text-center" style="padding: 40px;"><div class="spinner" style="margin: 0 auto;"></div></div>';

        try {
            const results = await this.apiCall('explore.php', {
                action: 'search',
                query: query
            });

            resultsDiv.innerHTML = this.renderCreatorGrid(results || []);
            if (window.lucide) window.lucide.createIcons();
        } catch (error) {
            resultsDiv.innerHTML = `<div class="card"><p>Error: ${error.message}</p></div>`;
        }
    }

    renderCreatorGrid(creators) {
        if (!creators || creators.length === 0) {
            return '<div class="card text-center"><p style="color: var(--hint-color);">Tidak ada kreator ditemukan</p></div>';
        }

        return creators.map(c => `
            <div class="card" style="display: flex; align-items: center; gap: 15px; padding: 15px;">
                <div class="avatar-circle" style="width: 50px; height: 50px; font-size: 20px;">
                    ${(c.display_name || 'C').charAt(0).toUpperCase()}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 15px;">${c.display_name}</div>
                    <div style="font-size: 12px; color: var(--hint-color);">@${c.username}</div>
                    <div style="font-size: 11px; margin-top: 4px; display: flex; gap: 10px;">
                        <span><i data-lucide="layers" style="width: 10px; height: 10px;"></i> ${c.total_media || 0} Konten</span>
                        ${c.is_verified ? '<span style="color: var(--success);"><i data-lucide="check-circle" style="width: 10px; height: 10px;"></i> Terverifikasi</span>' : ''}
                    </div>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="app.viewPublicCreatorProfile(${c.user_id})" style="width: auto; padding: 8px 12px;">
                    Lihat
                </button>
            </div>
        `).join('');
    }

    viewPublicCreatorProfile(userId) {
        // Redirect to their public page or open in bot
        const botUsername = 'MieBurungDaraBot'; // Fallback
        const url = `https://t.me/${botUsername}?start=creator_${userId}`;
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    async loadCreator() {
        if (!this.userData.is_creator) {
            return '<div class="card"><h3><i data-lucide="alert-circle"></i> Akses Ditolak</h3><p>Anda bukan kreator terverifikasi</p></div>';
        }

        const creatorData = await this.apiCall('creator.php');
        const activeGoal = creatorData.active_goal;

        const html = `
            <div class="grid-layout fade-in">
                <div class="card">
                    <h3><i data-lucide="award"></i> Statistik Kreator</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px;">
                        <div style="text-align: center; padding: 12px; background: rgba(16, 185, 129, 0.05); border-radius: var(--radius-md);">
                            <div style="font-size: 18px; font-weight: 700; color: var(--success);">${creatorData.stats.total_media || 0}</div>
                            <div style="font-size: 10px; color: var(--hint-color); font-weight: 600; text-transform: uppercase;">Konten</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(99, 102, 241, 0.05); border-radius: var(--radius-md);">
                            <div style="font-size: 18px; font-weight: 700; color: var(--primary);">Rp ${this.formatCompactNumber(creatorData.stats.total_earnings || 0)}</div>
                            <div style="font-size: 10px; color: var(--hint-color); font-weight: 600; text-transform: uppercase;">Earning</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(168, 85, 247, 0.05); border-radius: var(--radius-md);">
                            <div style="font-size: 18px; font-weight: 700; color: var(--secondary);">${creatorData.stats.total_donations || 0}</div>
                            <div style="font-size: 10px; color: var(--hint-color); font-weight: 600; text-transform: uppercase;">Donasi</div>
                        </div>
                    </div>
                </div>

                <div class="card goal-card">
                    <h3><i data-lucide="target"></i> Target Donasi</h3>
                    ${activeGoal ? `
                        <div class="goal-progress-container">
                            <div class="goal-header">
                                <span class="goal-title">${activeGoal.title}</span>
                                <span class="goal-percentage">${activeGoal.percentage}%</span>
                            </div>
                            <div class="goal-bar-bg">
                                <div class="goal-bar-fill" style="width: ${activeGoal.percentage}%"></div>
                            </div>
                            <div class="goal-footer">
                                <span>Rp ${this.formatCompactNumber(activeGoal.current_amount)}</span>
                                <span>Target: Rp ${this.formatCompactNumber(activeGoal.target_amount)}</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="app.deleteGoal(${activeGoal.id})" style="width: 100%; margin-top: 10px;">
                            <i data-lucide="trash-2"></i> Batalkan Target
                        </button>
                    ` : `
                        <div class="goal-empty-state">
                            <i data-lucide="goal"></i>
                            <p style="font-size: 14px; color: var(--hint-color); margin-bottom: 15px;">Belum ada target donasi aktif.</p>
                            <button class="btn btn-primary btn-sm" onclick="app.showGoalForm()">
                                <i data-lucide="plus"></i> Pasang Target Baru
                            </button>
                        </div>
                        <div id="goalFormContainer" style="display: none; margin-top: 15px;">
                            <div class="form-group">
                                <label>Judul Target</label>
                                <input type="text" id="goalTitle" placeholder="Misal: Beli Laptop Baru">
                            </div>
                            <div class="form-group">
                                <label>Nominal Target (Rp)</label>
                                <input type="number" id="goalAmount" placeholder="Minimal 1000">
                            </div>
                            <div class="form-group" style="display: flex; gap: 8px;">
                                <button class="btn btn-primary" onclick="app.saveGoal()" style="flex: 1;">Simpan</button>
                                <button class="btn btn-secondary" onclick="app.hideGoalForm()" style="flex: 1;">Batal</button>
                            </div>
                        </div>
                    `}
                </div>

                <div class="card">
                    <h3><i data-lucide="activity"></i> Aktivitas Terbaru</h3>
                    <div class="activity-feed">
                        ${creatorData.analytics.recent_donations && creatorData.analytics.recent_donations.length > 0 ? 
                            creatorData.analytics.recent_donations.slice(0, 5).map(don => `
                            <div class="activity-item">
                                <div class="activity-icon">
                                    <i data-lucide="heart"></i>
                                </div>
                                <div class="activity-content">
                                    <div class="activity-header">
                                        <span class="donor-name">${don.first_name || 'Anonim'}</span>
                                        <span class="activity-amount">+Rp ${this.formatCompactNumber(don.amount)}</span>
                                    </div>
                                    ${don.message ? `<div class="activity-message">${don.message}</div>` : ''}
                                    <div class="activity-time">${this.getRelativeTime(don.created_at)}</div>
                                </div>
                            </div>
                        `).join('') : '<p class="text-center" style="font-size: 13px; color: var(--hint-color); margin-top: 20px;">Belum ada aktivitas baru</p>'}
                    </div>
                </div>

                <div class="card col-full">
                    <h3><i data-lucide="trending-up"></i> Performa Donasi</h3>
                    <div style="margin-top: 10px;">
                        <canvas id="donationsChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <div class="card col-full">
                    <h3><i data-lucide="pie-chart"></i> Distribusi Nominal</h3>
                    <div style="margin-top: 10px;">
                        <canvas id="amountChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Store analytics data for post-render chart initialization
        this._creatorAnalytics = creatorData.analytics;
        return html;
    }

    async searchUsers() {
        const query = document.getElementById('userSearchQuery').value.trim();
        if (!query) {
            alert('Masukkan query pencarian');
            return;
        }

        try {
            const result = await this.apiCall('admin.php', {
                action: 'search_users',
                query: query
            });

            this.displayUserSearchResults(result);
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    displayUserSearchResults(users) {
        const container = document.getElementById('userSearchResults');

        if (!users || users.length === 0) {
            container.innerHTML = '<p>Tidak ada user ditemukan</p>';
            return;
        }

        let html = '<div style="max-height: 300px; overflow-y: auto;">';
        users.forEach(user => {
            const banBtnText = user.is_banned ? 'Unban' : 'Ban';
            const banBtnClass = user.is_banned ? 'btn-success' : 'btn-danger';

            html += `
                <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${user.name}</strong> ${user.is_creator ? '(Kreator' + (user.is_verified ? ' ✓' : ' ⚠️') + ')' : ''}
                            <br><small>@${user.username} | ID: ${user.id}</small>
                            <br><small>Saldo: Rp ${this.formatNumber(user.balance)}</small>
                        </div>
                        <div>
                            <button class="btn ${banBtnClass}" onclick="app.toggleUserBan(${user.id}, ${user.is_banned})">${banBtnText}</button>
                            <button class="btn btn-primary" onclick="app.adjustUserBalance(${user.id}, '${user.name}')">Adjust Saldo</button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    async toggleUserBan(userId, currentlyBanned) {
        try {
            const result = await this.apiCall('admin.php', {
                action: 'ban_user',
                targetUserId: userId,
                ban: !currentlyBanned
            });

            alert(result.message);
            // Refresh search results
            this.searchUsers();
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    adjustUserBalance(userId, userName) {
        document.getElementById('adjustUserId').value = userId;
        document.getElementById('adjustDescription').value = `Adjustment for ${userName}`;
        // Scroll to adjust form
        document.getElementById('adjustBalanceForm').scrollIntoView();
    }

    async loadSettings() {
        try {
            const result = await this.apiCall('admin.php', {
                action: 'get_settings'
            });

            this.displaySettings(result);
        } catch (error) {
            alert('Error loading settings: ' + error.message);
        }
    }

    displaySettings(settings) {
        const container = document.getElementById('settingsContainer');

        let html = '<div style="max-height: 400px; overflow-y: auto;">';
        Object.values(settings).forEach(setting => {
            html += `
                <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 8px;">
                    <div style="margin-bottom: 5px;">
                        <strong>${setting.key}</strong>
                        <br><small style="color: #666;">${setting.description}</small>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="setting_${setting.key}" value="${setting.value || ''}" style="flex: 1;">
                        <button class="btn btn-sm btn-primary" onclick="app.updateSetting('${setting.key}')">Update</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    async     updateSetting(key) {
        const value = document.getElementById(`setting_${key}`).value;

        try {
            const result = await this.apiCall('admin.php', {
                action: 'update_setting',
                key: key,
                value: value
            });

            alert(result.message);
        } catch (error) {
            alert('Error updating setting: ' + error.message);
        }
    }

    async loadAuditLogs() {
        const entityType = document.getElementById('auditEntityType').value;
        const userId = document.getElementById('auditUserId').value;

        try {
            const result = await this.apiCall('admin.php', {
                action: 'get_audit_logs',
                entity_type: entityType || undefined,
                user_id: userId || undefined,
                limit: 100
            });

            this.displayAuditLogs(result);
        } catch (error) {
            alert('Error loading audit logs: ' + error.message);
        }
    }

    displayAuditLogs(logs) {
        const container = document.getElementById('auditLogsContainer');

        if (!logs || logs.length === 0) {
            container.innerHTML = '<p>Tidak ada audit logs</p>';
            return;
        }

        let html = '<div style="max-height: 400px; overflow-y: auto; font-size: 12px;">';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 8px; border: 1px solid #ddd;">Time</th><th>Action</th><th>Entity</th><th>User</th><th>Details</th></tr></thead><tbody>';

        logs.forEach(log => {
            const changes = log.changes || {};
            const changesText = Object.keys(changes).length > 0
                ? Object.entries(changes).map(([k, v]) => `${k}: ${v.old || 'null'} → ${v.new || 'null'}`).join('; ')
                : 'No changes';

            html += `<tr>
                <td style="padding: 8px; border: 1px solid #ddd;">${new Date(log.created_at).toLocaleString()}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${log.action}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${log.entity_type}:${log.entity_id}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${log.user_id || 'System'}</td>
                <td style="padding: 8px; border: 1px solid #ddd; max-width: 300px; word-wrap: break-word;">${changesText}</td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    async loadBots() {
        try {
            const result = await this.apiCall('admin.php', {
                action: 'get_bots'
            });

            this.displayBots(result);
        } catch (error) {
            alert('Error loading bots: ' + error.message);
        }
    }

    displayBots(bots) {
        const container = document.getElementById('botsContainer');
        const form = document.getElementById('addBotForm');

        let html = '<button class="btn btn-success" onclick="document.getElementById(\'addBotForm\').style.display=\'block\'">Add New Bot</button>';
        html += '<div style="margin-top: 15px;">';

        if (!bots || bots.length === 0) {
            html += '<p>No bots configured</p>';
        } else {
            html += '<table style="width: 100%; border-collapse: collapse;">';
            html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 8px; border: 1px solid #ddd;">ID</th><th>Name</th><th>Username</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

            bots.forEach(bot => {
                const statusText = bot.is_active ? 'Active' : 'Inactive';
                const statusClass = bot.is_active ? 'status-success' : 'status-failed';
                const toggleText = bot.is_active ? 'Deactivate' : 'Activate';
                const toggleClass = bot.is_active ? 'btn-danger' : 'btn-success';

                html += `<tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${bot.id}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${bot.name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">@${bot.username}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;"><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        <button class="btn ${toggleClass}" onclick="app.toggleBot(${bot.id}, ${!bot.is_active})">${toggleText}</button>
                    </td>
                </tr>`;
            });

            html += '</tbody></table>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    async addBot() {
        const name = document.getElementById('botName').value;
        const username = document.getElementById('botUsername').value;
        const token = document.getElementById('botToken').value;
        const webhookSecret = document.getElementById('botWebhookSecret').value;

        if (!name || !username || !token) {
            alert('Name, username, and token are required');
            return;
        }

        try {
            const result = await this.apiCall('admin.php', {
                action: 'add_bot',
                name: name,
                username: username,
                token: token,
                webhook_secret: webhookSecret
            });

            alert(result.message);
            document.getElementById('addBotForm').style.display = 'none';
            // Clear form
            document.getElementById('botName').value = '';
            document.getElementById('botUsername').value = '';
            document.getElementById('botToken').value = '';
            document.getElementById('botWebhookSecret').value = '';
            // Reload bots
            this.loadBots();
        } catch (error) {
            alert('Error adding bot: ' + error.message);
        }
    }

    async toggleBot(botId, active) {
        try {
            const result = await this.apiCall('admin.php', {
                action: 'toggle_bot',
                bot_id: botId,
                active: active
            });

            alert(result.message);
            this.loadBots();
        } catch (error) {
            alert('Error toggling bot: ' + error.message);
        }
    }

    async loadAdmins() {
        try {
            const result = await this.apiCall('admin.php', {
                action: 'get_admins'
            });

            this.displayAdmins(result);
        } catch (error) {
            alert('Error loading admins: ' + error.message);
        }
    }

    displayAdmins(admins) {
        const container = document.getElementById('adminsContainer');
        const form = document.getElementById('addAdminForm');

        let html = '<button class="btn btn-success" onclick="document.getElementById(\'addAdminForm\').style.display=\'block\'">Add New Admin</button>';
        html += '<div style="margin-top: 15px;">';

        if (!admins || admins.length === 0) {
            html += '<p>No admins found</p>';
        } else {
            html += '<table style="width: 100%; border-collapse: collapse;">';
            html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 8px; border: 1px solid #ddd;">Name</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead><tbody>';

            admins.forEach(admin => {
                const statusText = admin.is_active ? 'Active' : 'Inactive';
                const statusClass = admin.is_active ? 'status-success' : 'status-failed';
                const roleEmoji = admin.role === 'super_admin' ? '👑' :
                                 admin.role === 'moderator' ? '🔧' :
                                 admin.role === 'finance' ? '💰' : '👤';

                const lastLogin = admin.last_login ? new Date(admin.last_login).toLocaleDateString() : 'Never';

                html += `<tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        ${admin.full_name}<br>
                        <small>${admin.telegram_username} (${admin.telegram_id})</small>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${roleEmoji} ${admin.role}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;"><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${lastLogin}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        ${admin.is_active ? `<button class="btn btn-danger btn-sm" onclick="app.deactivateAdmin(${admin.id})">Deactivate</button>` : '<span style="color: #999;">Inactive</span>'}
                    </td>
                </tr>`;
            });

            html += '</tbody></table>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    async addAdmin() {
        const telegramId = document.getElementById('adminTelegramId').value;
        const username = document.getElementById('adminUsername').value;
        const fullName = document.getElementById('adminFullName').value;
        const role = document.getElementById('adminRole').value;

        if (!telegramId || !username || !fullName || !role) {
            alert('All fields are required');
            return;
        }

        try {
            const result = await this.apiCall('admin.php', {
                action: 'add_admin',
                telegram_id: parseInt(telegramId),
                username: username,
                full_name: fullName,
                role: role
            });

            alert(result.message);
            document.getElementById('addAdminForm').style.display = 'none';
            // Clear form
            document.getElementById('adminTelegramId').value = '';
            document.getElementById('adminUsername').value = '';
            document.getElementById('adminFullName').value = '';
            document.getElementById('adminRole').value = '';
            // Reload admins
            this.loadAdmins();
        } catch (error) {
            alert('Error adding admin: ' + error.message);
        }
    }

    async deactivateAdmin(adminId) {
        if (!confirm('Are you sure you want to deactivate this admin?')) {
            return;
        }

        try {
            const result = await this.apiCall('admin.php', {
                action: 'deactivate_admin',
                admin_id: adminId
            });

            alert(result.message);
            this.loadAdmins();
        } catch (error) {
            alert('Error deactivating admin: ' + error.message);
        }
    }

    renderCreatorCharts(analytics) {
        if (!analytics) return;

        // Donations last 7 days chart
        const donationsCtx = document.getElementById('donationsChart');
        if (donationsCtx && analytics.donations_last_7_days) {
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
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        // Donations by amount chart
        const amountCtx = document.getElementById('amountChart');
        if (amountCtx && analytics.donations_by_amount) {
            new Chart(amountCtx, {
                type: 'doughnut',
                data: {
                    labels: analytics.donations_by_amount.map(d => d.range),
                    datasets: [{
                        data: analytics.donations_by_amount.map(d => d.count),
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    async apiCall(endpoint, data = {}) {
        const response = await fetch(`api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...data,
                botId: this.botId,
                userId: this.userData?.id || this.telegram.getUserId(),
                initData: this.telegram.getInitData()
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'API call failed');
        }
        return result.data;
    }

    async loadPendingPayments() {
        try {
            const payments = await this.apiCall('admin.php', { action: 'get_pending_payments' });
            this.displayPendingPayments(payments);
        } catch (error) {
            alert('Error loading pending payments: ' + error.message);
        }
    }

    displayPendingPayments(payments) {
        const container = document.getElementById('paymentContainer');

        if (!payments || payments.length === 0) {
            container.innerHTML = '<p>Tidak ada pembayaran pending</p>';
            return;
        }

        let html = '<div style="max-height: 500px; overflow-y: auto;">';
        payments.forEach(payment => {
            const typeText = payment.type === 'topup' ? 'Topup' : 'Penarikan';
            const typeColor = payment.type === 'topup' ? '#28a745' : '#007bff';

            html += `
                <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div>
                            <span style="background: ${typeColor}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${typeText}</span>
                            <strong>ID: ${payment.id}</strong>
                        </div>
                        <div style="font-weight: bold; font-size: 18px; color: #28a745;">
                            Rp ${this.formatNumber(payment.amount)}
                        </div>
                    </div>

                    <div style="margin-bottom: 10px;">
                        <div><strong>User:</strong> ${payment.user_name} (@${payment.username})</div>
                        <div><strong>Dibuat:</strong> ${new Date(payment.created_at).toLocaleString('id-ID')}</div>
                        ${payment.type === 'withdraw' ? `<div><strong>E-Wallet:</strong> ${payment.bank_name} - ${payment.account_name} (${payment.bank_account})</div>` : ''}
                        ${payment.type === 'withdraw' && payment.commission_amount ? `
                            <div style="background: #fff3cd; padding: 8px; border-radius: 4px; margin-top: 8px; font-size: 12px;">
                                <strong>💰 Detail Komisi:</strong><br>
                                Jumlah asli: Rp ${this.formatNumber(payment.original_amount)}<br>
                                Komisi (${payment.commission_rate}%): Rp ${this.formatNumber(payment.commission_amount)}<br>
                                <strong>Diterima user: Rp ${this.formatNumber(payment.amount)}</strong>
                            </div>
                        ` : ''}
                        ${payment.notes ? `<div><strong>Catatan:</strong> ${payment.notes}</div>` : ''}
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-success btn-sm" onclick="app.approvePayment(${payment.id}, '${payment.type}')">✅ Setujui</button>
                        <button class="btn btn-danger btn-sm" onclick="app.rejectPayment(${payment.id}, '${payment.type}')">❌ Tolak</button>
                        ${payment.type === 'topup' ? `<button class="btn btn-info btn-sm" onclick="app.viewPaymentProof(${payment.id})">👁️ Lihat Bukti</button>` : ''}
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    async approvePayment(paymentId, type) {
        if (!confirm('Apakah Anda yakin ingin menyetujui pembayaran ini?')) return;

        try {
            const result = await this.apiCall('admin.php', {
                action: 'approve_payment',
                payment_id: paymentId,
                payment_type: type
            });
            alert(result.message);
            await this.updateHeaderStats();
            this.loadPendingPayments(); // Refresh list
        } catch (error) {
            alert('Error approving payment: ' + error.message);
        }
    }

    async rejectPayment(paymentId, type) {
        const reason = prompt('Alasan penolakan (opsional):');
        if (reason === null) return; // Cancelled

        try {
            const result = await this.apiCall('admin.php', {
                action: 'reject_payment',
                payment_id: paymentId,
                payment_type: type,
                reason: reason
            });
            alert(result.message);
            this.loadPendingPayments(); // Refresh list
        } catch (error) {
            alert('Error rejecting payment: ' + error.message);
        }
    }

    async viewPaymentProof(id) {
        const modal = document.getElementById('proofModal');
        const img = document.getElementById('proofImage');
        const loader = document.getElementById('proofImageLoader');
        
        // Show modal and loader
        modal.style.display = 'flex';
        img.style.display = 'none';
        loader.style.display = 'flex';
        
        try {
            const result = await this.apiCall('admin.php', {
                action: 'get_payment_proof_url',
                proof_id: id
            });

            if (result.url) {
                img.src = result.url;
                img.onload = () => {
                    loader.style.display = 'none';
                    img.style.display = 'block';
                };
                img.onerror = () => {
                    alert('Gagal memuat gambar bukti dari server Telegram.');
                    this.closeProofModal();
                };
            } else {
                throw new Error('URL bukti tidak ditemukan');
            }
        } catch (error) {
            alert('Error fetching proof: ' + error.message);
            this.closeProofModal();
        }
    }

    closeProofModal() {
        const modal = document.getElementById('proofModal');
        modal.style.display = 'none';
        document.getElementById('proofImage').src = '';
    }

    async loadContentQueue() {
        try {
            const pendingContent = await this.apiCall('admin.php', { action: 'get_pending_content' });
            const approvedContent = await this.apiCall('admin.php', { action: 'get_approved_content' });
            this.displayContentQueue(pendingContent, approvedContent);
        } catch (error) {
            alert('Error loading content queue: ' + error.message);
        }
    }

    displayContentQueue(pendingContent, approvedContent) {
        const container = document.getElementById('contentContainer');

        let allContent = [];

        // Add pending content
        if (pendingContent && pendingContent.length > 0) {
            allContent = allContent.concat(pendingContent.map(item => ({ ...item, queue_type: 'pending' })));
        }

        // Add approved content
        if (approvedContent && approvedContent.length > 0) {
            allContent = allContent.concat(approvedContent.map(item => ({ ...item, queue_type: 'approved' })));
        }

        if (allContent.length === 0) {
            container.innerHTML = '<p>Tidak ada konten dalam queue</p>';
            return;
        }

        let html = '<div style="max-height: 500px; overflow-y: auto;">';

        // Group by status
        const pendingItems = allContent.filter(item => item.queue_type === 'pending');
        const approvedItems = allContent.filter(item => item.queue_type === 'approved');

        if (pendingItems.length > 0) {
            html += '<h4 style="margin-bottom: 15px; color: #856404;">⏳ Konten Pending Moderasi</h4>';
            pendingItems.forEach(item => {
                html += this.renderContentItem(item, 'pending');
            });
        }

        if (approvedItems.length > 0) {
            html += '<h4 style="margin-bottom: 15px; margin-top: 20px; color: #155724;">✅ Konten Disetujui - Siap Post</h4>';
            approvedItems.forEach(item => {
                html += this.renderContentItem(item, 'approved');
            });
        }

        html += '</div>';
        container.innerHTML = html;
    }

    renderContentItem(item, status) {
        const statusBadge = status === 'pending'
            ? '<span style="background: #ffc107; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Pending</span>'
            : '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">Approved</span>';

        const actions = status === 'pending'
            ? `
                <button class="btn btn-success btn-sm" onclick="app.approveContent(${item.id})">✅ Setujui</button>
                <button class="btn btn-danger btn-sm" onclick="app.rejectContent(${item.id})">❌ Tolak</button>
                <button class="btn btn-info btn-sm" onclick="app.viewContent(${item.id})">👁️ Lihat</button>
            `
            : `
                <button class="btn btn-primary btn-sm" onclick="app.postContentToChannel(${item.id})">📢 Post ke Channel</button>
                <button class="btn btn-info btn-sm" onclick="app.viewContent(${item.id})">👁️ Lihat</button>
            `;

        return `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <strong>Media #${item.id}</strong>
                        ${statusBadge}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        ${new Date(item.created_at).toLocaleDateString('id-ID')}
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    <div><strong>Creator:</strong> ${item.creator_name} (@${item.creator_username})</div>
                    <div><strong>Type:</strong> ${item.file_type}</div>
                    <div><strong>Size:</strong> ${this.formatFileSize(item.file_size)}</div>
                    ${item.caption ? `<div><strong>Caption:</strong> ${item.caption}</div>` : ''}
                </div>

                <div style="display: flex; gap: 10px;">
                    ${actions}
                </div>
            </div>
        `;
    }

    async approveContent(contentId) {
        if (!confirm('Apakah Anda yakin ingin menyetujui konten ini?')) return;

        try {
            const result = await this.apiCall('admin.php', {
                action: 'approve_content',
                content_id: contentId
            });
            alert(result.message);
            this.loadContentQueue(); // Refresh list
        } catch (error) {
            alert('Error approving content: ' + error.message);
        }
    }

    async rejectContent(contentId) {
        const reason = prompt('Alasan penolakan (opsional):');
        if (reason === null) return; // Cancelled

        try {
            const result = await this.apiCall('admin.php', {
                action: 'reject_content',
                content_id: contentId,
                reason: reason
            });
            alert(result.message);
            this.loadContentQueue(); // Refresh list
        } catch (error) {
            alert('Error rejecting content: ' + error.message);
        }
    }

    async postContentToChannel(contentId) {
        if (!confirm('Apakah Anda yakin ingin mem-post konten ini ke channel?')) return;

        try {
            const result = await this.apiCall('admin.php', {
                action: 'post_content_to_channel',
                content_id: contentId
            });
            alert(result.message);
            this.loadContentQueue(); // Refresh list
        } catch (error) {
            alert('Error posting content to channel: ' + error.message);
        }
    }

    async viewContent(contentId) {
        try {
            const content = await this.apiCall('admin.php', {
                action: 'get_content_details',
                content_id: contentId
            });

            // Open content in new window or modal
            if (content.file_url) {
                window.open(content.file_url, '_blank');
            } else {
                alert('Konten tidak tersedia untuk preview');
            }
        } catch (error) {
            alert('Error viewing content: ' + error.message);
        }
    }

    async loadCreators() {
        try {
            const creators = await this.apiCall('admin.php', { action: 'get_creators' });
            this.displayCreators(creators);
        } catch (error) {
            alert('Error loading creators: ' + error.message);
        }
    }

    displayCreators(creators) {
        const container = document.getElementById('creatorsContainer');

        if (!creators || creators.length === 0) {
            container.innerHTML = '<p>Tidak ada creator</p>';
            return;
        }

        let html = '<div style="max-height: 400px; overflow-y: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: #f8f9fa;"><th style="padding: 8px; border: 1px solid #ddd;">Name</th><th>Status</th><th>Content</th><th>Earnings</th><th>Actions</th></tr></thead><tbody>';

        creators.forEach(creator => {
            const verifiedIcon = creator.is_verified ? '✓' : '⚠️';
            const verifiedColor = creator.is_verified ? '#28a745' : '#ffc107';

            html += `<tr>
                <td style="padding: 8px; border: 1px solid #ddd;">
                    ${creator.display_name || creator.user_name}<br>
                    <small>@${creator.username}</small>
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                    <span style="color: ${verifiedColor};">${verifiedIcon}</span> ${creator.is_verified ? 'Verified' : 'Pending'}
                </td>
                <td style="padding: 8px; border: 1px solid #ddd;">${creator.total_content || 0}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">Rp ${this.formatNumber(creator.total_earnings || 0)}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">
                    ${!creator.is_verified ? `<button class="btn btn-success btn-sm" onclick="app.verifyCreator(${creator.id})">Verify</button>` : ''}
                    <button class="btn btn-info btn-sm" onclick="app.viewCreatorProfile(${creator.id})">View</button>
                </td>
            </tr>`;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    async verifyCreator(creatorId) {
        if (!confirm('Apakah Anda yakin ingin memverifikasi creator ini?')) return;

        try {
            const result = await this.apiCall('admin.php', {
                action: 'verify_creator',
                creator_id: creatorId
            });
            alert(result.message);
            this.loadCreators(); // Refresh list
        } catch (error) {
            alert('Error verifying creator: ' + error.message);
        }
    }

    async viewCreatorProfile(creatorId) {
        try {
            const profile = await this.apiCall('admin.php', {
                action: 'get_creator_profile',
                creator_id: creatorId
            });

            // Display profile in a modal or alert for now
            alert(`Creator Profile:\nName: ${profile.display_name}\nBio: ${profile.bio || 'N/A'}\nE-Wallet: ${profile.bank_account || 'N/A'}\nContent: ${profile.total_content}\nEarnings: Rp ${this.formatNumber(profile.total_earnings)}`);
        } catch (error) {
            alert('Error viewing creator profile: ' + error.message);
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    setupFormHandlers() {
        // Balance adjustment form
        const adjustForm = document.getElementById('adjustBalanceForm');
        if (adjustForm) {
            adjustForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(adjustForm);
                const data = {
                    action: 'adjust_balance',
                    targetUserId: parseInt(formData.get('adjustUserId')),
                    amount: parseInt(formData.get('adjustAmount')),
                    description: formData.get('adjustDescription')
                };

                try {
                    const result = await this.apiCall('admin.php', data);
                    document.getElementById('adjustResult').innerHTML =
                        '<div style="color: green;">✅ ' + result.message + '</div>';
                    await this.updateHeaderStats();
                    adjustForm.reset();
                } catch (error) {
                    document.getElementById('adjustResult').innerHTML =
                        '<div style="color: red;">❌ ' + error.message + '</div>';
                }
            });
        }
    }

    setupWithdrawalForm() {
        const withdrawForm = document.getElementById('withdrawForm');
        const withdrawAmount = document.getElementById('withdrawAmount');

        if (withdrawAmount) {
            // Calculate commission in real-time
            withdrawAmount.addEventListener('input', () => {
                this.calculateWithdrawalCommission();
            });
        }

        if (withdrawForm) {
            withdrawForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const amount = parseInt(document.getElementById('withdrawAmount').value);
                const bankName = document.getElementById('bankName').value;
                const bankAccount = document.getElementById('bankAccount').value;
                const accountName = document.getElementById('accountName').value;
                const confirmed = document.getElementById('withdrawConfirmation').checked;

                if (!confirmed) {
                    alert('Silakan setujui persyaratan penarikan terlebih dahulu.');
                    return;
                }

                const resultDiv = document.getElementById('withdrawResult');

                try {
                    const result = await this.apiCall('wallet.php', {
                        action: 'withdraw',
                        amount: amount,
                        bankName: bankName,
                        bankAccount: bankAccount,
                        accountName: accountName
                    });

                    resultDiv.innerHTML = '<div style="color: green;">✅ ' + result.message + '</div>';
                    withdrawForm.reset();
                    document.getElementById('commissionBreakdown').style.display = 'none';
                    await this.updateHeaderStats();

                    // Refresh wallet data
                    if (this.currentPage === 'wallet') {
                        this.loadPage('wallet');
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<div style="color: red;">❌ ' + error.message + '</div>';
                }
            });
        }
    }

    calculateWithdrawalCommission() {
        const amount = parseInt(document.getElementById('withdrawAmount').value) || 0;
        const breakdown = document.getElementById('commissionBreakdown');
        const details = document.getElementById('commissionDetails');
        const finalAmount = document.getElementById('finalAmount');

        if (amount >= 50000) {
            const commissionRate = 10.00; // 10%
            const commissionAmount = (amount * commissionRate) / 100;
            const receiveAmount = amount - commissionAmount;

            details.innerHTML = 'Jumlah penarikan: Rp ' + this.formatNumber(amount) + '<br>Komisi platform (10%): Rp ' + this.formatNumber(commissionAmount);
            finalAmount.innerHTML = '💰 Anda akan menerima: Rp ' + this.formatNumber(receiveAmount);
            breakdown.style.display = 'block';
        } else {
            breakdown.style.display = 'none';
        }
    }

    setupCreatorProfileForm() {
        const profileForm = document.getElementById('creatorProfileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const displayName = document.getElementById('creatorDisplayName').value;
                const bio = document.getElementById('creatorBio').value;
                const bankAccount = document.getElementById('creatorBankAccount').value;

                const resultDiv = document.getElementById('profileResult');

                try {
                    const result = await this.apiCall('creator.php', {
                        action: 'update_profile',
                        displayName: displayName,
                        bio: bio,
                        bankAccount: bankAccount
                    });

                    resultDiv.innerHTML = '<div style="color: green;">✅ ' + result.message + '</div>';
                } catch (error) {
                    resultDiv.innerHTML = '<div style="color: red;">❌ ' + error.message + '</div>';
                }
            });
        }
    }



    showGoalForm() {
        document.querySelector('.goal-empty-state').style.display = 'none';
        document.getElementById('goalFormContainer').style.display = 'block';
    }

    hideGoalForm() {
        document.querySelector('.goal-empty-state').style.display = 'block';
        document.getElementById('goalFormContainer').style.display = 'none';
    }

    async saveGoal() {
        const title = document.getElementById('goalTitle').value.trim();
        const amount = document.getElementById('goalAmount').value;

        if (!title || !amount) {
            this.telegram.showAlert('Mohon isi semua bidang');
            return;
        }

        try {
            await this.apiCall('creator.php', {
                action: 'save_goal',
                title: title,
                targetAmount: amount
            });
            this.telegram.showAlert('Target donasi berhasil disimpan!');
            this.loadPage('creator');
        } catch (error) {
            this.telegram.showAlert('Gagal menyimpan target: ' + error.message);
        }
    }

    async deleteGoal(goalId) {
        if (!confirm('Apakah Anda yakin ingin membatalkan target donasi ini?')) return;

        try {
            await this.apiCall('creator.php', {
                action: 'delete_goal',
                goalId: goalId
            });
            this.telegram.showAlert('Target donasi berhasil dibatalkan');
            this.loadPage('creator');
        } catch (error) {
            this.telegram.showAlert('Gagal membatalkan target: ' + error.message);
        }
    }

    setupTopupForm() {
        const topupForm = document.getElementById('topupForm');
        if (topupForm) {
            topupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const amount = parseInt(document.getElementById('topupAmount').value);
                try {
                    const result = await this.apiCall('wallet.php', {
                        action: 'topup',
                        amount: amount
                    });
                    this.telegram.showAlert(result.message);
                    topupForm.reset();
                    await this.updateHeaderStats();
                    if (this.currentPage === 'wallet') this.loadPage('wallet');
                } catch (error) {
                    this.telegram.showAlert('Error: ' + error.message);
                }
            });
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat('id-ID').format(num);
    }

    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Baru saja';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m lalu`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}j lalu`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}h lalu`;

        return date.toLocaleDateString('id-ID');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
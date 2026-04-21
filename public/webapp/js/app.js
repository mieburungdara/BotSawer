// Main App JavaScript
class App {
    constructor() {
        this.telegram = new TelegramWebApp();
        this.currentPage = 'dashboard';
        this.userData = null;
        // Get bot_id from URL parameter (should be Telegram bot ID)
        const urlParams = new URLSearchParams(window.location.search);
        this.botId = urlParams.get('bot_id') || '1'; // Default to '1' if not specified
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

            if (response.success) {
                this.userData = response.user;
                this.showMainApp();
                this.loadPage('dashboard');
            } else {
                throw new Error(response.message || 'Authentication failed');
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.telegram.showAlert('Gagal mengautentikasi: ' + error.message);
            document.getElementById('authError').style.display = 'block';
        }
    }

    showMainApp() {
        document.getElementById('mainApp').style.display = 'block';

        // Update user info
        const userName = this.userData.first_name + (this.userData.last_name ? ' ' + this.userData.last_name : '');
        document.getElementById('userName').textContent = userName;

        // Show admin buttons if admin
        if (this.userData.is_admin) {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        }

        // Show creator buttons if creator
        if (this.userData.is_creator) {
            document.querySelectorAll('.creator-only').forEach(el => el.style.display = 'block');
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
                case 'wallet':
                    html = await this.loadWallet();
                    break;
                case 'history':
                    html = await this.loadHistory();
                    break;
                case 'creator':
                    html = await this.loadCreator();
                    break;
                case 'admin':
                    html = await this.loadAdmin();
                    break;
                default:
                    html = '<div class="card"><h3>Halaman tidak ditemukan</h3></div>';
            }

            content.innerHTML = html;
        } catch (error) {
            console.error('Load page error:', error);
            content.innerHTML = '<div class="card"><h3>Error</h3><p>Gagal memuat halaman</p></div>';
        }
    }

    async loadDashboard() {
        const walletData = await this.apiCall('wallet.php');

        return `
            <div class="card balance-card">
                <h3>Saldo Dompet</h3>
                <div class="balance-amount">Rp ${this.formatNumber(walletData.balance || 0)}</div>
                <p>Total Deposit: Rp ${this.formatNumber(walletData.total_deposit || 0)}</p>
                <p>Total Penarikan: Rp ${this.formatNumber(walletData.total_withdraw || 0)}</p>
            </div>

            <div class="card">
                <h3>Statistik</h3>
                <p>Donasi Sukses: ${walletData.total_donations || 0}</p>
                <p>Media Diunggah: ${walletData.total_media || 0}</p>
            </div>

            <div class="card">
                <h3>Aksi Cepat</h3>
                <button class="btn btn-primary" onclick="window.Telegram.WebApp.close()">Tutup App</button>
            </div>
        `;
    }

    async loadWallet() {
        const walletData = await this.apiCall('wallet.php');

        return `
            <div class="card">
                <h3>Informasi Dompet</h3>
                <p><strong>Saldo Tersedia:</strong> Rp ${this.formatNumber(walletData.balance || 0)}</p>
                <p><strong>Total Deposit:</strong> Rp ${this.formatNumber(walletData.total_deposit || 0)}</p>
                <p><strong>Total Penarikan:</strong> Rp ${this.formatNumber(walletData.total_withdraw || 0)}</p>
            </div>

            <div class="card">
                <h3>Topup Saldo</h3>
                <form id="topupForm">
                    <div class="form-group">
                        <label>Nominal Topup</label>
                        <input type="number" id="topupAmount" min="10000" step="1000" required>
                    </div>
                    <button type="submit" class="btn btn-success">Ajukan Topup</button>
                </form>
            </div>

            <div class="card">
                <h3>Penarikan Saldo</h3>
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <strong>ℹ️ Info Biaya:</strong> Platform mengenakan komisi 10% dari nominal penarikan untuk biaya operasional.
                </div>
                <form id="withdrawForm">
                    <div class="form-group">
                        <label>Nominal Penarikan (Min: Rp 50.000)</label>
                        <input type="number" id="withdrawAmount" min="50000" step="1000" required>
                        <div id="commissionBreakdown" style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; display: none;">
                            <small>
                                <div id="commissionDetails"></div>
                                <div id="finalAmount" style="font-weight: bold; margin-top: 5px;"></div>
                            </small>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Nama Bank</label>
                        <select id="bankName" required>
                            <option value="">Pilih Bank</option>
                            <option value="BCA">BCA</option>
                            <option value="Mandiri">Mandiri</option>
                            <option value="BRI">BRI</option>
                            <option value="BNI">BNI</option>
                            <option value="CIMB">CIMB Niaga</option>
                            <option value="Danamon">Danamon</option>
                            <option value="Permata">Permata</option>
                            <option value="BSI">BSI</option>
                            <option value="OCBC">OCBC NISP</option>
                            <option value="Maybank">Maybank</option>
                            <option value="Panin">Panin</option>
                            <option value="Mega">Mega</option>
                            <option value="Bukopin">Bukopin</option>
                            <option value="Sahabat Sampoerna">Sahabat Sampoerna</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Nomor Rekening</label>
                        <input type="text" id="bankAccount" placeholder="Contoh: 1234567890" required>
                    </div>
                    <div class="form-group">
                        <label>Nama Pemilik Rekening</label>
                        <input type="text" id="accountName" placeholder="Sesuai KTP" required>
                    </div>
                    <div class="form-group">
                        <label style="display: flex; align-items: center;">
                            <input type="checkbox" id="withdrawConfirmation" required style="margin-right: 10px;">
                            Saya setuju dengan biaya komisi 10% dan memahami bahwa admin akan memproses pembayaran dalam 1-3 hari kerja
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary">Ajukan Penarikan</button>
                    <div id="withdrawResult" style="margin-top: 10px;"></div>
                </form>
            </div>
        `;
    }

    async loadHistory() {
        const transactions = await this.apiCall('transactions.php');

        let tableRows = '';
        if (transactions && transactions.length > 0) {
            transactions.forEach(tx => {
                const statusClass = tx.status === 'success' ? 'status-success' :
                                  tx.status === 'pending' ? 'status-pending' : 'status-failed';
                tableRows += `
                    <tr>
                        <td>${new Date(tx.created_at).toLocaleDateString('id-ID')}</td>
                        <td>${tx.description}</td>
                        <td>Rp ${this.formatNumber(tx.amount)}</td>
                        <td><span class="status-badge ${statusClass}">${tx.status}</span></td>
                    </tr>
                `;
            });
        } else {
            tableRows = '<tr><td colspan="4">Belum ada transaksi</td></tr>';
        }

        return `
            <div class="card">
                <h3>Riwayat Transaksi</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Deskripsi</th>
                            <th>Jumlah</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    async loadAdmin() {
        if (!this.userData.is_admin) {
            return '<div class="card"><h3>Akses Ditolak</h3><p>Anda bukan admin</p></div>';
        }

        const adminRole = this.userData.admin_role;
        const adminData = await this.apiCall('admin.php', { action: 'stats' });

        let html = '';

        // Common sections for all admins
        html += `
            <div class="card">
                <h3>Statistik Sistem</h3>
                <p>Total User: ${adminData.total_users || 0}</p>
                <p>Total Transaksi: ${adminData.total_transactions || 0}</p>
                <p>Saldo Sistem: Rp ${this.formatNumber(adminData.total_balance || 0)}</p>
            </div>

            <div class="card">
                <h3>Audit Logs</h3>
                <div style="margin-bottom: 15px;">
                    <select id="auditEntityType" style="margin-right: 10px;">
                        <option value="">All Types</option>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                        <option value="creator">Creator</option>
                    </select>
                    <input type="number" id="auditUserId" placeholder="User ID (optional)" style="margin-right: 10px;">
                    <button class="btn btn-secondary" onclick="app.loadAuditLogs()">Load Logs</button>
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

        return html;
    }

    async loadCreator() {
        if (!this.userData.is_creator) {
            return '<div class="card"><h3>Akses Ditolak</h3><p>Anda bukan kreator terverifikasi</p></div>';
        }

        const creatorData = await this.apiCall('creator.php');

        return `
            <div class="card">
                <h3>Statistik Kreator</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-top: 15px;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #34c759;">${creatorData.total_media || 0}</div>
                        <div style="font-size: 12px; color: #666;">Konten</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #007aff;">Rp ${this.formatNumber(creatorData.total_earnings || 0)}</div>
                        <div style="font-size: 12px; color: #666;">Pendapatan</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: bold; color: #ff9500;">${creatorData.total_donations || 0}</div>
                        <div style="font-size: 12px; color: #666;">Donasi</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3>Donasi 7 Hari Terakhir</h3>
                <canvas id="donationsChart" width="400" height="200"></canvas>
            </div>

            <div class="card">
                <h3>Distribusi Nominal Donasi</h3>
                <canvas id="amountChart" width="400" height="200"></canvas>
            </div>

            <div class="card">
                <h3>Konten Terbaru</h3>
                ${this.renderContentList(creatorData.recent_content || [])}
            </div>

            <div class="card">
                <h3>Top Konten</h3>
                ${this.renderTopContent(creatorData.top_content || [])}
            </div>

            <div class="card">
                <h3>Pengaturan Profil</h3>
                <form id="creatorProfileForm">
                    <div class="form-group">
                        <label>Display Name</label>
                        <input type="text" id="creatorDisplayName" value="${creatorData.profile?.display_name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Bio</label>
                        <textarea id="creatorBio" rows="3">${creatorData.profile?.bio || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Rekening Bank (untuk penarikan)</label>
                        <input type="text" id="creatorBankAccount" value="${creatorData.profile?.bank_account || ''}" placeholder="Contoh: BCA - 1234567890 - Nama Pemilik">
                    </div>
                    <button type="submit" class="btn btn-primary">Update Profil</button>
                    <div id="profileResult" style="margin-top: 10px;"></div>
                </form>
            </div>
        `;

        // Render charts after DOM is updated
        setTimeout(() => {
            this.renderCreatorCharts(creatorData.analytics);
        }, 100);
    }

    renderContentList(content) {
        if (!content.length) {
            return '<p>Belum ada konten</p>';
        }

        return `<div style="max-height: 300px; overflow-y: auto;">
            ${content.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                    <div>
                        <div style="font-weight: 600;">Media #${item.id}</div>
                        <div style="font-size: 12px; color: #666;">${new Date(item.created_at).toLocaleDateString('id-ID')}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: #34c759;">Rp ${this.formatNumber(item.total_donations || 0)}</div>
                        <div style="font-size: 12px; color: #666;">${item.donation_count || 0} donasi</div>
                    </div>
                </div>
            `).join('')}
        </div>`;
    }

    renderTopContent(content) {
        if (!content.length) {
            return '<p>Belum ada data</p>';
        }

        return `<div style="max-height: 300px; overflow-y: auto;">
            ${content.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                    <div>
                        <div style="font-weight: 600;">Media #${item.id}</div>
                        <div style="font-size: 12px; color: #666;">${item.file_type}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: #ff9500;">Rp ${this.formatNumber(item.total_donations || 0)}</div>
                        <div style="font-size: 12px; color: #666;">${item.donation_count || 0} donasi</div>
                    </div>
                </div>
            `).join('')}
        </div>`;
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
                userId: this.telegram.getUserId(),
                initData: this.telegram.getInitData()
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'API call failed');
        }
        return result.data;
    }
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
                        ${payment.type === 'withdraw' ? `<div><strong>Bank:</strong> ${payment.bank_name} - ${payment.account_name} (${payment.bank_account})</div>` : ''}
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
                        <button class="btn btn-info btn-sm" onclick="app.viewPaymentProof('${payment.proof_file_id}')">👁️ Lihat Bukti</button>
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

    async viewPaymentProof(fileId) {
        // For now, show placeholder. In production, this would fetch and display the payment proof image
        alert('Fitur lihat bukti pembayaran sedang dikembangkan. File ID: ' + fileId);
        // TODO: Implement payment proof viewing
        // This would require:
        // 1. API endpoint to get file URL from Telegram
        // 2. Or serve images through our server
        // 3. Modal to display the image
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
            alert(`Creator Profile:\nName: ${profile.display_name}\nBio: ${profile.bio || 'N/A'}\nBank: ${profile.bank_account || 'N/A'}\nContent: ${profile.total_content}\nEarnings: Rp ${this.formatNumber(profile.total_earnings)}`);
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



    formatNumber(num) {
        return new Intl.NumberFormat('id-ID').format(num);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
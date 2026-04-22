import { formatNumber, formatFileSize } from '../utils.js';

/**
 * Admin Page Module
 */
export async function loadAdmin(app) {
    if (!app.userData.is_admin) {
        return '<div class="card"><h3>Akses Ditolak</h3><p>Anda bukan admin</p></div>';
    }

    const adminRole = app.userData.admin_role;
    const adminData = await app.apiCall('admin.php', { action: 'stats' });

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
                    <div style="font-size: 20px; font-weight: 700; color: var(--primary);">Rp ${formatNumber(adminData.total_balance || 0)}</div>
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
                        <input type="number" id="adjustUserId" required name="adjustUserId">
                    </div>
                    <div class="form-group">
                        <label>Jumlah (positif = tambah, negatif = kurang)</label>
                        <input type="number" id="adjustAmount" step="1000" required name="adjustAmount">
                    </div>
                    <div class="form-group">
                        <label>Deskripsi</label>
                        <input type="text" id="adjustDescription" required name="adjustDescription">
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

export async function searchUsers(app) {
    const query = document.getElementById('userSearchQuery').value.trim();
    if (!query) {
        app.telegram.showAlert('Masukkan query pencarian');
        return;
    }

    try {
        const result = await app.apiCall('admin.php', {
            action: 'search_users',
            query: query
        });

        displayUserSearchResults(app, result);
    } catch (error) {
        app.telegram.showAlert('Error: ' + error.message);
    }
}

export function displayUserSearchResults(app, users) {
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
                        <br><small>Saldo: Rp ${formatNumber(user.balance)}</small>
                    </div>
                    <div>
                        <button class="btn ${banBtnClass}" onclick="app.toggleUserBan(${user.id}, ${user.is_banned})">${banBtnText}</button>
                        <button class="btn btn-primary" onclick="app.adjustUserBalance(${user.id}, '${user.name.replace(/'/g, "\\'")}')">Adjust Saldo</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

export async function toggleUserBan(app, userId, currentlyBanned) {
    try {
        const result = await app.apiCall('admin.php', {
            action: 'ban_user',
            targetUserId: userId,
            ban: !currentlyBanned
        });

        app.telegram.showAlert(result.message);
        // Refresh search results
        searchUsers(app);
    } catch (error) {
        app.telegram.showAlert('Error: ' + error.message);
    }
}

export function adjustUserBalance(app, userId, userName) {
    document.getElementById('adjustUserId').value = userId;
    document.getElementById('adjustDescription').value = `Adjustment for ${userName}`;
    // Scroll to adjust form
    document.getElementById('adjustBalanceForm').scrollIntoView();
}

export async function loadAuditLogs(app) {
    const entityType = document.getElementById('auditEntityType').value;
    const userId = document.getElementById('auditUserId').value;

    try {
        const result = await app.apiCall('admin.php', {
            action: 'get_audit_logs',
            entity_type: entityType || undefined,
            user_id: userId || undefined,
            limit: 100
        });

        displayAuditLogs(app, result);
    } catch (error) {
        app.telegram.showAlert('Error loading audit logs: ' + error.message);
    }
}

export function displayAuditLogs(app, logs) {
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

export async function loadBots(app) {
    try {
        const result = await app.apiCall('admin.php', {
            action: 'get_bots'
        });

        displayBots(app, result);
    } catch (error) {
        app.telegram.showAlert('Error loading bots: ' + error.message);
    }
}

export function displayBots(app, bots) {
    const container = document.getElementById('botsContainer');

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

export async function addBot(app) {
    const name = document.getElementById('botName').value;
    const username = document.getElementById('botUsername').value;
    const token = document.getElementById('botToken').value;
    const webhookSecret = document.getElementById('botWebhookSecret').value;

    if (!name || !username || !token) {
        app.telegram.showAlert('Name, username, and token are required');
        return;
    }

    try {
        const result = await app.apiCall('admin.php', {
            action: 'add_bot',
            name: name,
            username: username,
            token: token,
            webhook_secret: webhookSecret
        });

        app.telegram.showAlert(result.message);
        document.getElementById('addBotForm').style.display = 'none';
        // Clear form
        document.getElementById('botName').value = '';
        document.getElementById('botUsername').value = '';
        document.getElementById('botToken').value = '';
        document.getElementById('botWebhookSecret').value = '';
        // Reload bots
        loadBots(app);
    } catch (error) {
        app.telegram.showAlert('Error adding bot: ' + error.message);
    }
}

export async function toggleBot(app, botId, active) {
    try {
        const result = await app.apiCall('admin.php', {
            action: 'toggle_bot',
            bot_id: botId,
            active: active
        });

        app.telegram.showAlert(result.message);
        loadBots(app);
    } catch (error) {
        app.telegram.showAlert('Error toggling bot: ' + error.message);
    }
}

export async function loadAdmins(app) {
    try {
        const result = await app.apiCall('admin.php', {
            action: 'get_admins'
        });

        displayAdmins(app, result);
    } catch (error) {
        app.telegram.showAlert('Error loading admins: ' + error.message);
    }
}

export function displayAdmins(app, admins) {
    const container = document.getElementById('adminsContainer');

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

export async function addAdmin(app) {
    const telegramId = document.getElementById('adminTelegramId').value;
    const username = document.getElementById('adminUsername').value;
    const fullName = document.getElementById('adminFullName').value;
    const role = document.getElementById('adminRole').value;

    if (!telegramId || !username || !fullName || !role) {
        app.telegram.showAlert('All fields are required');
        return;
    }

    try {
        const result = await app.apiCall('admin.php', {
            action: 'add_admin',
            telegram_id: parseInt(telegramId),
            username: username,
            full_name: fullName,
            role: role
        });

        app.telegram.showAlert(result.message);
        document.getElementById('addAdminForm').style.display = 'none';
        // Clear form
        document.getElementById('adminTelegramId').value = '';
        document.getElementById('adminUsername').value = '';
        document.getElementById('adminFullName').value = '';
        document.getElementById('adminRole').value = '';
        // Reload admins
        loadAdmins(app);
    } catch (error) {
        app.telegram.showAlert('Error adding admin: ' + error.message);
    }
}

export async function deactivateAdmin(app, adminId) {
    if (!confirm('Are you sure you want to deactivate this admin?')) {
        return;
    }

    try {
        const result = await app.apiCall('admin.php', {
            action: 'deactivate_admin',
            admin_id: adminId
        });

        app.telegram.showAlert(result.message);
        loadAdmins(app);
    } catch (error) {
        app.telegram.showAlert('Error deactivating admin: ' + error.message);
    }
}

export async function loadPendingPayments(app) {
    try {
        const payments = await app.apiCall('admin.php', { action: 'get_pending_payments' });
        displayPendingPayments(app, payments);
    } catch (error) {
        app.telegram.showAlert('Error loading pending payments: ' + error.message);
    }
}

export function displayPendingPayments(app, payments) {
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
                        Rp ${formatNumber(payment.amount)}
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    <div><strong>User:</strong> ${payment.user_name} (@${payment.username})</div>
                    <div><strong>Dibuat:</strong> ${new Date(payment.created_at).toLocaleString('id-ID')}</div>
                    ${payment.type === 'withdraw' ? `<div><strong>E-Wallet:</strong> ${payment.bank_name} - ${payment.account_name} (${payment.bank_account})</div>` : ''}
                    ${payment.type === 'withdraw' && payment.commission_amount ? `
                        <div style="background: #fff3cd; padding: 8px; border-radius: 4px; margin-top: 8px; font-size: 12px;">
                            <strong>💰 Detail Komisi:</strong><br>
                            Jumlah asli: Rp ${formatNumber(payment.original_amount)}<br>
                            Komisi (${payment.commission_rate}%): Rp ${formatNumber(payment.commission_amount)}<br>
                            <strong>Diterima user: Rp ${formatNumber(payment.amount)}</strong>
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

export async function approvePayment(app, paymentId, type) {
    if (!confirm('Apakah Anda yakin ingin menyetujui pembayaran ini?')) return;

    try {
        const result = await app.apiCall('admin.php', {
            action: 'approve_payment',
            payment_id: paymentId,
            payment_type: type
        });
        app.telegram.showAlert(result.message);
        await app.updateHeaderStats();
        loadPendingPayments(app); // Refresh list
    } catch (error) {
        app.telegram.showAlert('Error approving payment: ' + error.message);
    }
}

export async function rejectPayment(app, paymentId, type) {
    const reason = prompt('Alasan penolakan (opsional):');
    if (reason === null) return; // Cancelled

    try {
        const result = await app.apiCall('admin.php', {
            action: 'reject_payment',
            payment_id: paymentId,
            payment_type: type,
            reason: reason
        });
        app.telegram.showAlert(result.message);
        loadPendingPayments(app); // Refresh list
    } catch (error) {
        app.telegram.showAlert('Error rejecting payment: ' + error.message);
    }
}

export async function viewPaymentProof(app, id) {
    const modal = document.getElementById('proofModal');
    const img = document.getElementById('proofImage');
    const loader = document.getElementById('proofImageLoader');
    
    // Show modal and loader
    modal.style.display = 'flex';
    img.style.display = 'none';
    loader.style.display = 'flex';
    
    try {
        const result = await app.apiCall('admin.php', {
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
                app.telegram.showAlert('Gagal memuat gambar bukti dari server Telegram.');
                app.closeProofModal();
            };
        } else {
            throw new Error('URL bukti tidak ditemukan');
        }
    } catch (error) {
        app.telegram.showAlert('Error fetching proof: ' + error.message);
        app.closeProofModal();
    }
}

export async function loadContentQueue(app) {
    try {
        const pendingContent = await app.apiCall('admin.php', { action: 'get_pending_content' });
        const approvedContent = await app.apiCall('admin.php', { action: 'get_approved_content' });
        displayContentQueue(app, pendingContent, approvedContent);
    } catch (error) {
        app.telegram.showAlert('Error loading content queue: ' + error.message);
    }
}

export function displayContentQueue(app, pendingContent, approvedContent) {
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
            html += renderContentItem(item, 'pending');
        });
    }

    if (approvedItems.length > 0) {
        html += '<h4 style="margin-bottom: 15px; margin-top: 20px; color: #155724;">✅ Konten Disetujui - Siap Post</h4>';
        approvedItems.forEach(item => {
            html += renderContentItem(item, 'approved');
        });
    }

    html += '</div>';
    container.innerHTML = html;
}

export function renderContentItem(item, status) {
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
                <div><strong>Size:</strong> ${formatFileSize(item.file_size)}</div>
                ${item.caption ? `<div><strong>Caption:</strong> ${item.caption}</div>` : ''}
            </div>

            <div style="display: flex; gap: 10px;">
                ${actions}
            </div>
        </div>
    `;
}

export async function approveContent(app, contentId) {
    if (!confirm('Apakah Anda yakin ingin menyetujui konten ini?')) return;

    try {
        const result = await app.apiCall('admin.php', {
            action: 'approve_content',
            content_id: contentId
        });
        app.telegram.showAlert(result.message);
        loadContentQueue(app); // Refresh list
    } catch (error) {
        app.telegram.showAlert('Error approving content: ' + error.message);
    }
}

export async function rejectContent(app, contentId) {
    const reason = prompt('Alasan penolakan (opsional):');
    if (reason === null) return; // Cancelled

    try {
        const result = await app.apiCall('admin.php', {
            action: 'reject_content',
            content_id: contentId,
            reason: reason
        });
        app.telegram.showAlert(result.message);
        loadContentQueue(app); // Refresh list
    } catch (error) {
        app.telegram.showAlert('Error rejecting content: ' + error.message);
    }
}

export async function postContentToChannel(app, contentId) {
    if (!confirm('Apakah Anda yakin ingin mem-post konten ini ke channel?')) return;

    try {
        const result = await app.apiCall('admin.php', {
            action: 'post_content_to_channel',
            content_id: contentId
        });
        app.telegram.showAlert(result.message);
        loadContentQueue(app); // Refresh list
    } catch (error) {
        app.telegram.showAlert('Error posting content to channel: ' + error.message);
    }
}

export async function viewContent(app, contentId) {
    try {
        const content = await app.apiCall('admin.php', {
            action: 'get_content_details',
            content_id: contentId
        });

        // Open content in new window or modal
        if (content.file_url) {
            window.open(content.file_url, '_blank');
        } else {
            app.telegram.showAlert('Konten tidak tersedia untuk preview');
        }
    } catch (error) {
        app.telegram.showAlert('Error viewing content: ' + error.message);
    }
}

export async function loadCreators(app) {
    try {
        const creators = await app.apiCall('admin.php', { action: 'get_creators' });
        displayCreators(app, creators);
    } catch (error) {
        app.telegram.showAlert('Error loading creators: ' + error.message);
    }
}

export function displayCreators(app, creators) {
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
            <td style="padding: 8px; border: 1px solid #ddd;">Rp ${formatNumber(creator.total_earnings || 0)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
                ${!creator.is_verified ? `<button class="btn btn-success btn-sm" onclick="app.verifyCreator(${creator.id})">Verify</button>` : ''}
                <button class="btn btn-info btn-sm" onclick="app.viewCreatorProfile(${creator.id})">View</button>
            </td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

export async function verifyCreator(app, creatorId) {
    if (!confirm('Apakah Anda yakin ingin memverifikasi creator ini?')) return;

    try {
        const result = await app.apiCall('admin.php', {
            action: 'verify_creator',
            creator_id: creatorId
        });
        app.telegram.showAlert(result.message);
        loadCreators(app); // Refresh list
    } catch (error) {
        app.telegram.showAlert('Error verifying creator: ' + error.message);
    }
}

export async function viewCreatorProfile(app, creatorId) {
    try {
        const profile = await app.apiCall('admin.php', {
            action: 'get_creator_profile',
            creator_id: creatorId
        });

        // Display profile in a modal or alert for now
        alert(`Creator Profile:\nName: ${profile.display_name}\nBio: ${profile.bio || 'N/A'}\nE-Wallet: ${profile.bank_account || 'N/A'}\nContent: ${profile.total_content}\nEarnings: Rp ${formatNumber(profile.total_earnings)}`);
    } catch (error) {
        app.telegram.showAlert('Error viewing creator profile: ' + error.message);
    }
}

export function setupAdminFormHandlers(app) {
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
                const result = await app.apiCall('admin.php', data);
                document.getElementById('adjustResult').innerHTML =
                    '<div style="color: green;">✅ ' + result.message + '</div>';
                await app.updateHeaderStats();
                adjustForm.reset();
            } catch (error) {
                document.getElementById('adjustResult').innerHTML =
                    '<div style="color: red;">❌ ' + error.message + '</div>';
            }
        });
    }
}

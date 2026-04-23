import { formatNumber } from '../utils.js';

/**
 * Wallet Page Module
 */
export async function loadWallet(app) {
    const walletData = await app.apiCall('wallet.php');
    const transactions = await app.apiCall('transactions.php');
    
    // Store settings in app for use in forms
    app.platformCommission = walletData.commission_rate || 10;
    app.adminFeesMap = walletData.admin_fees_map || {};
    app.minWithdraw = walletData.min_withdraw || 50000;
    app.currentBalance = walletData.balance || 0;

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
                            ${tx.amount > 0 ? '+' : ''}${formatNumber(tx.amount)}
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
                        <span style="font-weight: 700; color: var(--primary);">Rp ${formatNumber(walletData.balance || 0)}</span>
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 0;"><i data-lucide="arrow-up-right"></i> Tarik Saldo</h3>
                    <div style="font-size: 12px; padding: 4px 8px; background: rgba(99, 102, 241, 0.1); color: var(--primary); border-radius: 20px; font-weight: 600;">
                        Min. Rp ${formatNumber(app.minWithdraw)}
                    </div>
                </div>

                <div style="background: var(--secondary-bg-color); padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid var(--glass-border);">
                    <div style="display: flex; align-items: center; gap: 12px; color: var(--hint-color); margin-bottom: 5px;">
                        <i data-lucide="wallet" style="width: 16px; height: 16px;"></i>
                        <span style="font-size: 13px;">Saldo Tersedia</span>
                    </div>
                    <div style="font-size: 24px; font-weight: 800; color: var(--text-color);">
                        Rp ${formatNumber(walletData.balance || 0)}
                    </div>
                </div>

                <form id="withdrawForm">
                    <div class="form-group">
                        <label>Nominal Penarikan</label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-weight: 700; color: var(--hint-color);">Rp</span>
                            <input type="number" id="withdrawAmount" min="${app.minWithdraw}" max="${app.currentBalance}" step="1000" placeholder="0" style="padding-left: 45px; font-size: 18px; font-weight: 700;" required>
                        </div>
                    </div>

                    <div id="withdrawalDetailsToggle" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; padding: 12px; background: var(--secondary-bg-color); border-radius: var(--radius-md); cursor: pointer; border: 1px solid var(--glass-border);">
                        <div style="display: flex; align-items: center; gap: 10px; color: var(--primary); font-size: 13px; font-weight: 600;">
                            <i data-lucide="settings-2" style="width: 16px; height: 16px;"></i>
                            <span>Tujuan Penarikan</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px; color: var(--hint-color); font-size: 12px;">
                            <span id="withdrawalSummaryText">${walletData.last_withdrawal ? walletData.last_withdrawal.bank_name : 'Belum diatur'}</span>
                            <i data-lucide="chevron-down" id="withdrawalDetailsChevron" style="width: 16px; height: 16px; transition: transform 0.3s;"></i>
                        </div>
                    </div>

                    <div id="withdrawalDetailsContent" style="display: none; padding: 5px 0 15px 0;">
                        <div class="form-group">
                            <label>Metode Penarikan</label>
                            <div class="wallet-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-top: 8px;">
                                ${['DANA', 'GoPay', 'ShopeePay', 'OVO'].map(method => {
                                    const lastBank = (walletData.last_withdrawal && walletData.last_withdrawal.bank_name) ? walletData.last_withdrawal.bank_name.toUpperCase() : 'DANA';
                                    const isChecked = lastBank === method.toUpperCase() ? 'checked' : '';
                                    const iconMap = { 'DANA': 'D', 'GoPay': 'G', 'ShopeePay': 'S', 'OVO': 'O' };
                                    const colorMap = { 'DANA': '#008ced', 'GoPay': '#00aa13', 'ShopeePay': '#ee4d2d', 'OVO': '#4c2a86' };
                                    return `
                                        <label class="wallet-item">
                                            <input type="radio" name="bankName" value="${method}" ${isChecked} required style="display: none;">
                                            <div class="wallet-card">
                                                <div class="wallet-icon" style="background: ${colorMap[method]}">${iconMap[method]}</div>
                                                <span>${method}</span>
                                            </div>
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Nomor Tujuan (HP)</label>
                            <input type="text" id="bankAccount" value="${walletData.last_withdrawal ? walletData.last_withdrawal.account_number : ''}" placeholder="Contoh: 0812..." required>
                        </div>

                        <div class="form-group">
                            <label>Nama Penerima</label>
                            <input type="text" id="accountName" value="${walletData.last_withdrawal ? walletData.last_withdrawal.account_name : ''}" placeholder="Sesuai nama di aplikasi e-wallet" required>
                        </div>
                    </div>

                    <div id="commissionBreakdown" style="display: none; margin-bottom: 20px;">
                        <div style="background: var(--secondary-bg-color); padding: 15px; border-radius: var(--radius-md); border-left: 4px solid var(--primary);">
                            <div id="commissionDetails" style="font-size: 13px; line-height: 1.6; color: var(--hint-color);"></div>
                            <hr style="border: 0; border-top: 1px dashed var(--glass-border); margin: 10px 0;">
                            <div id="finalAmount" style="font-size: 15px; font-weight: 700; color: var(--primary);"></div>
                        </div>
                    </div>

                    <div class="form-group" style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: rgba(99, 102, 241, 0.03); border-radius: 8px;">
                        <input type="checkbox" id="withdrawConfirmation" style="width: 18px; height: 18px; margin-top: 2px;" required>
                        <label for="withdrawConfirmation" style="font-size: 12px; font-weight: normal; margin-bottom: 0; color: var(--hint-color);">
                            Saya mengonfirmasi bahwa data tujuan penarikan di atas sudah benar. Kesalahan data bukan tanggung jawab kami.
                        </label>
                    </div>

                    <div id="withdrawResult" style="margin-bottom: 15px;"></div>

                    <button type="submit" class="btn btn-primary btn-full" style="height: 50px; font-size: 16px;">
                        <i data-lucide="check-circle"></i> Konfirmasi Penarikan
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

export function setupWithdrawalForm(app) {
    const withdrawForm = document.getElementById('withdrawForm');
    const withdrawAmount = document.getElementById('withdrawAmount');
    const detailsToggle = document.getElementById('withdrawalDetailsToggle');
    const detailsContent = document.getElementById('withdrawalDetailsContent');
    const detailsChevron = document.getElementById('withdrawalDetailsChevron');

    if (detailsToggle) {
        detailsToggle.addEventListener('click', () => {
            const isHidden = detailsContent.style.display === 'none';
            detailsContent.style.display = isHidden ? 'block' : 'none';
            detailsChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });
    }

    const bankRadios = document.querySelectorAll('input[name="bankName"]');
    bankRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            calculateWithdrawalCommission(app);
            const summaryText = document.getElementById('withdrawalSummaryText');
            if (summaryText) summaryText.innerText = radio.value;
        });
    });

    if (withdrawAmount) {
        // Calculate commission in real-time
        withdrawAmount.addEventListener('input', () => {
            calculateWithdrawalCommission(app);
        });
    }

    if (withdrawForm) {
        withdrawForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const amountInput = document.getElementById('withdrawAmount');
            const amount = parseInt(amountInput.value);

            if (amount > app.currentBalance) {
                app.telegram.showAlert('Saldo Anda tidak mencukupi untuk penarikan sebesar Rp ' + formatNumber(amount));
                return;
            }

            if (amount < app.minWithdraw) {
                app.telegram.showAlert('Minimum penarikan adalah Rp ' + formatNumber(app.minWithdraw));
                return;
            }
            const bankRadio = document.querySelector('input[name="bankName"]:checked');
            
            if (!bankRadio) {
                app.telegram.showAlert('Silakan pilih metode penarikan.');
                return;
            }

            const bankName = bankRadio.value;
            const bankAccount = document.getElementById('bankAccount').value;
            const accountName = document.getElementById('accountName').value;
            const confirmed = document.getElementById('withdrawConfirmation').checked;

            if (!confirmed) {
                app.telegram.showAlert('Silakan konfirmasi data penarikan terlebih dahulu.');
                return;
            }

            const resultDiv = document.getElementById('withdrawResult');
            const submitBtn = withdrawForm.querySelector('button[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="spinner-sm"></div> Memproses...';

                const result = await app.apiCall('wallet.php', {
                    action: 'withdraw',
                    amount: amount,
                    bankName: bankName,
                    bankAccount: bankAccount,
                    accountName: accountName
                });

                resultDiv.innerHTML = `
                    <div style="background: rgba(16, 185, 129, 0.1); color: var(--success); padding: 12px; border-radius: 8px; font-size: 13px; text-align: center;">
                        <i data-lucide="check-circle" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;"></i>
                        ${result.message}
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                
                setTimeout(() => {
                    if (app.currentPage === 'wallet') app.loadPage('wallet');
                }, 2000);

            } catch (error) {
                resultDiv.innerHTML = `
                    <div style="background: rgba(239, 68, 68, 0.1); color: var(--danger); padding: 12px; border-radius: 8px; font-size: 13px; text-align: center;">
                        <i data-lucide="alert-circle" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;"></i>
                        ${error.message}
                    </div>
                `;
                if (window.lucide) window.lucide.createIcons();
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="check-circle"></i> Konfirmasi Penarikan';
            }
        });
    }
}

export function calculateWithdrawalCommission(app) {
    const amount = parseInt(document.getElementById('withdrawAmount').value) || 0;
    const breakdown = document.getElementById('commissionBreakdown');
    const details = document.getElementById('commissionDetails');
    const finalAmount = document.getElementById('finalAmount');
    
    const bankRadio = document.querySelector('input[name="bankName"]:checked');
    const bankName = bankRadio ? bankRadio.value.toUpperCase() : 'DEFAULT';
    const adminFee = app.adminFeesMap ? (app.adminFeesMap[bankName] || app.adminFeesMap['DEFAULT'] || 2500) : 0;

    if (amount >= app.minWithdraw) {
        const commissionRate = app.platformCommission || 10.00;
        const commissionAmount = (amount * commissionRate) / 100;
        const totalFees = commissionAmount + adminFee;
        const receiveAmount = amount - totalFees;

        details.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Jumlah Penarikan</span>
                <span style="color: var(--text-color); font-weight: 600;">Rp ${formatNumber(amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Komisi Platform (${commissionRate}%)</span>
                <span style="color: var(--danger); font-weight: 600;">- Rp ${formatNumber(commissionAmount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Biaya Admin (${bankRadio ? bankRadio.value : 'Sistem'})</span>
                <span style="color: var(--danger); font-weight: 600;">- Rp ${formatNumber(adminFee)}</span>
            </div>
        `;
        finalAmount.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>Estimasi Diterima</span>
                <span style="font-size: 18px;">Rp ${formatNumber(receiveAmount)}</span>
            </div>
        `;
        breakdown.style.display = 'block';
    } else {
        breakdown.style.display = 'none';
    }
}

export function setupTopupForm(app) {
    const topupForm = document.getElementById('topupForm');
    if (topupForm) {
        topupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseInt(document.getElementById('topupAmount').value);
            try {
                const result = await app.apiCall('wallet.php', {
                    action: 'topup',
                    amount: amount
                });
                app.telegram.showAlert(result.message);
                topupForm.reset();
                await app.updateHeaderStats();
                if (app.currentPage === 'wallet') app.loadPage('wallet');
            } catch (error) {
                app.telegram.showAlert('Error: ' + error.message);
            }
        });
    }
}

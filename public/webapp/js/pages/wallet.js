import { formatNumber } from '../utils.js';

/**
 * Wallet Page Module
 */
export async function loadWallet(app) {
    const walletData = await app.apiCall('wallet.php');
    const transactions = await app.apiCall('transactions.php');

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
                    <div class="form-group" style="display: flex; align-items: flex-start; gap: 8px;">
                        <input type="checkbox" id="withdrawConfirmation" style="margin-top: 4px;">
                        <label for="withdrawConfirmation" style="font-size: 12px; font-weight: normal; margin-bottom: 0;">Saya mengonfirmasi bahwa data rekening yang saya masukkan di atas sudah benar.</label>
                    </div>
                    <div id="commissionBreakdown" style="display: none; font-size: 12px; color: var(--hint-color); margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 8px;">
                        <div id="commissionDetails"></div>
                        <div id="finalAmount" style="font-weight: 700; color: var(--primary); margin-top: 5px;"></div>
                    </div>
                    <div id="withdrawResult" style="margin-bottom: 15px; font-size: 13px;"></div>
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

export function setupWithdrawalForm(app) {
    const withdrawForm = document.getElementById('withdrawForm');
    const withdrawAmount = document.getElementById('withdrawAmount');

    if (withdrawAmount) {
        // Calculate commission in real-time
        withdrawAmount.addEventListener('input', () => {
            calculateWithdrawalCommission();
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
                app.telegram.showAlert('Silakan setujui persyaratan penarikan terlebih dahulu.');
                return;
            }

            const resultDiv = document.getElementById('withdrawResult');

            try {
                const result = await app.apiCall('wallet.php', {
                    action: 'withdraw',
                    amount: amount,
                    bankName: bankName,
                    bankAccount: bankAccount,
                    accountName: accountName
                });

                resultDiv.innerHTML = '<div style="color: green;">✅ ' + result.message + '</div>';
                withdrawForm.reset();
                document.getElementById('commissionBreakdown').style.display = 'none';
                await app.updateHeaderStats();

                // Refresh wallet data
                if (app.currentPage === 'wallet') {
                    app.loadPage('wallet');
                }
            } catch (error) {
                resultDiv.innerHTML = '<div style="color: red;">❌ ' + error.message + '</div>';
            }
        });
    }
}

export function calculateWithdrawalCommission() {
    const amount = parseInt(document.getElementById('withdrawAmount').value) || 0;
    const breakdown = document.getElementById('commissionBreakdown');
    const details = document.getElementById('commissionDetails');
    const finalAmount = document.getElementById('finalAmount');

    if (amount >= 50000) {
        const commissionRate = 10.00; // 10%
        const commissionAmount = (amount * commissionRate) / 100;
        const receiveAmount = amount - commissionAmount;

        details.innerHTML = 'Jumlah penarikan: Rp ' + formatNumber(amount) + '<br>Komisi platform (10%): Rp ' + formatNumber(commissionAmount);
        finalAmount.innerHTML = '💰 Anda akan menerima: Rp ' + formatNumber(receiveAmount);
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

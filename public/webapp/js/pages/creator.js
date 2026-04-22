import { formatCompactNumber, getRelativeTime } from '../utils.js';

/**
 * Creator Page Module
 */
export async function loadCreator(app) {
    if (!app.userData.is_creator) {
        return '<div class="card"><h3><i data-lucide="alert-circle"></i> Akses Ditolak</h3><p>Anda bukan kreator terverifikasi</p></div>';
    }

    const creatorData = await app.apiCall('creator.php');
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
                        <div style="font-size: 18px; font-weight: 700; color: var(--primary);">Rp ${formatCompactNumber(creatorData.stats.total_earnings || 0)}</div>
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
                            <span>Rp ${formatCompactNumber(activeGoal.current_amount)}</span>
                            <span>Target: Rp ${formatCompactNumber(activeGoal.target_amount)}</span>
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
                                    <span class="activity-amount">+Rp ${formatCompactNumber(don.amount)}</span>
                                </div>
                                ${don.message ? `<div class="activity-message">${don.message}</div>` : ''}
                                <div class="activity-time">${getRelativeTime(don.created_at)}</div>
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

    // Store analytics data for post-render chart initialization in the main app
    app._creatorAnalytics = creatorData.analytics;
    return html;
}

export function setupCreatorProfileForm(app) {
    const profileForm = document.getElementById('creatorProfileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const displayName = document.getElementById('creatorDisplayName').value;
            const bio = document.getElementById('creatorBio').value;
            const bankAccount = document.getElementById('creatorBankAccount').value;

            const resultDiv = document.getElementById('profileResult');

            try {
                const result = await app.apiCall('creator.php', {
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

export function showGoalForm() {
    document.querySelector('.goal-empty-state').style.display = 'none';
    document.getElementById('goalFormContainer').style.display = 'block';
}

export function hideGoalForm() {
    document.querySelector('.goal-empty-state').style.display = 'block';
    document.getElementById('goalFormContainer').style.display = 'none';
}

export async function saveGoal(app) {
    const title = document.getElementById('goalTitle').value.trim();
    const amount = document.getElementById('goalAmount').value;

    if (!title || !amount) {
        app.telegram.showAlert('Mohon isi semua bidang');
        return;
    }

    try {
        await app.apiCall('creator.php', {
            action: 'save_goal',
            title: title,
            targetAmount: amount
        });
        app.telegram.showAlert('Target donasi berhasil disimpan!');
        app.loadPage('creator');
    } catch (error) {
        app.telegram.showAlert('Gagal menyimpan target: ' + error.message);
    }
}

export async function deleteGoal(app, goalId) {
    if (!confirm('Apakah Anda yakin ingin membatalkan target donasi ini?')) return;

    try {
        await app.apiCall('creator.php', {
            action: 'delete_goal',
            goalId: goalId
        });
        app.telegram.showAlert('Target donasi berhasil dibatalkan');
        app.loadPage('creator');
    } catch (error) {
        app.telegram.showAlert('Gagal membatalkan target: ' + error.message);
    }
}

/**
 * Dashboard Page Module
 */
export async function loadDashboard(app) {
    return `
        <div class="grid-layout fade-in">
            <div class="card">
                <h3><i data-lucide="sparkles"></i> Selamat Datang!</h3>
                <p style="color: var(--hint-color); font-size: 14px;">Gunakan menu di bawah untuk mengelola saldo, melihat statistik, atau mengatur konten Anda.</p>
            </div>
        </div>
    `;
}

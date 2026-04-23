/**
 * Info Page Module
 */
export async function loadInfo(app) {
    return `
        <div class="grid-layout fade-in">
            <div class="card col-full">
                <div style="text-align: center; margin-bottom: 25px;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);">
                        <i data-lucide="zap" style="width: 40px; height: 40px; color: white;"></i>
                    </div>
                    <h2 style="font-family: 'Outfit', sans-serif; font-size: 24px; margin-bottom: 5px;">Tentang Bot Sawer</h2>
                    <p style="color: var(--hint-color); font-size: 14px;">Versi 1.0.0 (Beta)</p>
                </div>

                <div style="line-height: 1.6; color: var(--text-color); font-size: 15px;">
                    <p><strong>Bot Sawer</strong> adalah platform monetisasi konten digital yang dirancang khusus untuk para kreator di ekosistem Telegram.</p>
                    
                    <div style="margin-top: 20px; padding: 15px; background: rgba(99, 102, 241, 0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                        <h4 style="margin-bottom: 10px; color: var(--primary);">Misi Kami</h4>
                        <p style="font-size: 14px; margin: 0;">Memberdayakan kreator independen untuk dapat menghasilkan pendapatan dari karya mereka dengan cara yang mudah, aman, dan transparan melalui integrasi Bot Telegram yang canggih.</p>
                    </div>

                    <h4 style="margin-top: 25px; margin-bottom: 10px;">Fitur Utama</h4>
                    <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
                        <li>Donasi Langsung (Tip & Support)</li>
                        <li>Penjualan Konten Media Eksklusif</li>
                        <li>Sistem Penarikan Dana Otomatis ke E-Wallet</li>
                        <li>Statistik Pendapatan Real-time</li>
                        <li>Manajemen Konten yang Mudah</li>
                    </ul>

                    <div style="margin-top: 30px; text-align: center; font-size: 13px; color: var(--hint-color);">
                        &copy; 2026 Bot Sawer Team. Seluruh hak cipta dilindungi.
                    </div>
                </div>
            </div>
        </div>
    `;
}

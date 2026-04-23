/**
 * Help Page Module
 */
export async function loadHelp(app) {
    return `
        <div class="grid-layout fade-in">
            <div class="card col-full">
                <h3><i data-lucide="help-circle"></i> Panduan Penggunaan</h3>
                <p style="color: var(--hint-color); font-size: 14px; margin-bottom: 20px;">Ikuti langkah-langkah di bawah ini untuk mulai menghasilkan uang di ${app.settings.app_name}.</p>

                <div class="help-steps">
                    <div class="help-step">
                        <div class="step-num">1</div>
                        <div class="step-content">
                            <h4>Verifikasi Akun</h4>
                            <p>Buka menu Profil dan pastikan akun Anda sudah terverifikasi sebagai kreator untuk mulai menerima donasi di ${app.settings.app_name}.</p>
                        </div>
                    </div>

                    <div class="help-step">
                        <div class="step-num">2</div>
                        <div class="step-content">
                            <h4>Upload Konten</h4>
                            <p>Masuk ke menu 'Kelola Konten' dan unggah media (Foto/Video) Anda. Tentukan harga yang diinginkan.</p>
                        </div>
                    </div>

                    <div class="help-step">
                        <div class="step-num">3</div>
                        <div class="step-content">
                            <h4>Sebarkan Link</h4>
                            <p>Salin link profil Anda dari Dashboard dan bagikan ke media sosial atau channel Telegram Anda.</p>
                        </div>
                    </div>

                    <div class="help-step">
                        <div class="step-num">4</div>
                        <div class="step-content">
                            <h4>Tarik Pendapatan</h4>
                            <p>Setelah saldo terkumpul (minimal Rp 50.000), Anda dapat melakukan penarikan dana ke E-Wallet Anda di menu Dompet.</p>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 25px; padding: 15px; background: rgba(var(--primary-rgb), 0.05); border-radius: 12px; display: flex; align-items: center; gap: 15px;">
                    <i data-lucide="message-square" style="color: var(--primary);"></i>
                    <div style="font-size: 13px;">
                        Masih butuh bantuan? Hubungi kami melalui <a href="https://t.me/BotSawerSupport" target="_blank" style="color: var(--primary); font-weight: 700; text-decoration: none;">Customer Support</a>.
                    </div>
                </div>
            </div>
        </div>
    `;
}

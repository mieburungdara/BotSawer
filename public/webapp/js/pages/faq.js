/**
 * FAQ Page Module
 */
export async function loadFaq(app) {
    const faqs = [
        {
            q: "Apa itu Bot Sawer?",
            a: "Bot Sawer adalah platform yang membantu kreator Telegram untuk menerima donasi dan menjual konten digital secara aman."
        },
        {
            q: "Berapa potongan (komisi) platform?",
            a: "Potongan platform saat ini adalah 10% dari setiap transaksi donasi atau penjualan konten, digunakan untuk biaya operasional dan server."
        },
        {
            q: "Kapan saya bisa menarik saldo?",
            a: "Anda dapat menarik saldo kapan saja setelah mencapai batas minimum penarikan (Rp 50.000)."
        },
        {
            q: "Berapa lama proses penarikan dana?",
            a: "Proses penarikan dana biasanya memakan waktu 1x24 jam kerja, tergantung pada metode E-Wallet yang dipilih."
        },
        {
            q: "Apakah konten saya aman?",
            a: "Ya, kami menggunakan enkripsi dan sistem verifikasi Telegram untuk memastikan hanya pembeli sah yang dapat mengakses konten Anda."
        }
    ];

    let faqHtml = '';
    faqs.forEach((item, index) => {
        faqHtml += `
            <div class="faq-item" style="margin-bottom: 12px; border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; background: var(--secondary-bg-color);">
                <div class="faq-question" onclick="const a = this.nextElementSibling; a.style.display = a.style.display === 'none' ? 'block' : 'none'; this.querySelector('i').style.transform = a.style.display === 'block' ? 'rotate(180deg)' : 'rotate(0deg)';" style="padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 14px;">
                    <span>${item.q}</span>
                    <i data-lucide="chevron-down" style="width: 16px; height: 16px; transition: transform 0.3s; color: var(--hint-color);"></i>
                </div>
                <div class="faq-answer" style="display: none; padding: 0 16px 16px; font-size: 13px; color: var(--hint-color); line-height: 1.6; border-top: 1px solid rgba(0,0,0,0.03);">
                    ${item.a}
                </div>
            </div>
        `;
    });

    return `
        <div class="grid-layout fade-in">
            <div class="col-full">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="font-family: 'Outfit', sans-serif;">Frequently Asked Questions</h2>
                    <p style="color: var(--hint-color); font-size: 14px;">Pertanyaan yang sering diajukan</p>
                </div>
                ${faqHtml}
                
                <div style="margin-top: 30px; text-align: center;">
                    <p style="font-size: 13px; color: var(--hint-color);">Punya pertanyaan lain?</p>
                    <button class="btn btn-primary btn-sm" onclick="window.open('https://t.me/BotSawerSupport', '_blank')">Tanya CS Kami</button>
                </div>
            </div>
        </div>
    `;
}

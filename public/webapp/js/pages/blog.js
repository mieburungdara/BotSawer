/**
 * Blog Page Module
 */
export async function loadBlog(app) {
    const posts = [
        {
            id: 1,
            title: "Tips Meningkatkan Pendapatan Donasi",
            summary: "Pelajari cara berinteraksi dengan pendukung Anda agar mereka lebih loyal memberikan saweran.",
            date: "2026-04-20",
            category: "Tips",
            image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&q=80"
        },
        {
            id: 2,
            title: "Update Fitur: Penarikan Dana ke OVO & GoPay",
            summary: "Kami baru saja menambahkan metode penarikan dana baru untuk memudahkan Anda mencairkan saldo.",
            date: "2026-04-18",
            category: "Update",
            image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80"
        },
        {
            id: 3,
            title: "Keamanan Konten di Bot Sawer",
            summary: "Bagaimana kami melindungi konten media Anda dari pembajakan dan penggunaan tidak sah.",
            date: "2026-04-15",
            category: "Security",
            image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80"
        }
    ];

    let postsHtml = '';
    posts.forEach(post => {
        postsHtml += `
            <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 20px;">
                <img src="${post.image}" style="width: 100%; height: 160px; object-fit: cover;">
                <div style="padding: 16px;">
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
                        <span style="font-size: 10px; padding: 3px 8px; background: rgba(99, 102, 241, 0.1); color: var(--primary); border-radius: 10px; font-weight: 700; text-transform: uppercase;">${post.category}</span>
                        <span style="font-size: 11px; color: var(--hint-color);">${new Date(post.date).toLocaleDateString('id-ID')}</span>
                    </div>
                    <h3 style="margin-bottom: 8px; font-size: 17px;">${post.title}</h3>
                    <p style="font-size: 14px; color: var(--hint-color); line-height: 1.5; margin-bottom: 15px;">${post.summary}</p>
                    <button class="btn btn-secondary btn-sm" onclick="app.telegram.showAlert('Fitur membaca artikel lengkap akan segera hadir!')">Baca Selengkapnya</button>
                </div>
            </div>
        `;
    });

    return `
        <div class="grid-layout fade-in">
            <div class="col-full">
                <h2 style="font-family: 'Outfit', sans-serif; margin-bottom: 20px;">Blog & Berita</h2>
                ${postsHtml}
            </div>
        </div>
    `;
}

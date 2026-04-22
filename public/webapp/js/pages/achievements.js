import { formatCompactNumber, getTierColor } from '../utils.js';

/**
 * Achievements Page Module
 */
export async function loadAchievements(app) {
    try {
        const data = await app.apiCall('achievements.php');
        const { categories, special } = data;
        
        let unlockedTiersCount = 0;
        categories.forEach(cat => {
            unlockedTiersCount += cat.tiers.filter(t => t.unlocked).length;
        });
        const specialUnlocked = special.filter(s => s.unlocked).length;

        return `
            <div class="grid-layout fade-in">
                <div class="card col-full" style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border: none; padding: 30px 20px;">
                    <h2 style="font-family: 'Outfit'; font-size: 28px; margin-bottom: 5px;">Hall of Fame</h2>
                    <p style="opacity: 0.7; font-size: 14px;">Koleksi pencapaian dan perjalananmu di Bot Sawer.</p>
                    <div style="display: flex; gap: 15px; margin-top: 20px;">
                        <div style="background: rgba(255,255,255,0.1); padding: 10px 15px; border-radius: 12px; flex: 1; text-align: center;">
                            <div style="font-size: 20px; font-weight: 800; color: #facc15;">${unlockedTiersCount}</div>
                            <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6;">Tiers Unlocked</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.1); padding: 10px 15px; border-radius: 12px; flex: 1; text-align: center;">
                            <div style="font-size: 20px; font-weight: 800; color: #6366f1;">${specialUnlocked}</div>
                            <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6;">Special Badges</div>
                        </div>
                    </div>
                </div>

                ${special && special.length > 0 ? `
                    <div class="col-full">
                        <h3 style="margin-bottom: 12px; font-size: 14px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">Special Badges</h3>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                            ${special.map(s => `
                                <div class="card" style="display: flex; align-items: center; gap: 15px; background: ${s.unlocked ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.1), transparent)' : 'rgba(0,0,0,0.02)'}; opacity: ${s.unlocked ? '1' : '0.5'}">
                                    <div style="width: 44px; height: 44px; background: ${s.unlocked ? 'var(--primary)' : 'var(--hint-color)'}; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                        <i data-lucide="${s.icon}"></i>
                                    </div>
                                    <div>
                                        <div style="font-weight: 700; font-size: 15px;">${s.title}</div>
                                        <div style="font-size: 12px; color: var(--hint-color);">${s.description}</div>
                                    </div>
                                    ${s.unlocked ? '<div style="margin-left: auto; color: var(--success);"><i data-lucide="check-circle"></i></div>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="col-full">
                    <h3 style="margin-bottom: 12px; font-size: 14px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">Pencapaian Bertingkat</h3>
                    ${categories.map(cat => {
                        const currentTier = [...cat.tiers].reverse().find(t => t.unlocked) || { label: 'None', value: 0 };
                        const nextTier = cat.tiers.find(t => !t.unlocked);
                        const progress = nextTier ? Math.min(100, (cat.current / nextTier.value) * 100) : 100;

                        return `
                            <div class="card mb-4" style="padding: 20px;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                                    <div style="display: flex; gap: 15px;">
                                        <div style="width: 48px; height: 48px; background: var(--secondary-bg-color); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--primary);">
                                            <i data-lucide="${cat.icon}"></i>
                                        </div>
                                        <div>
                                            <div style="font-weight: 800; font-size: 18px;">${cat.title}</div>
                                            <div style="font-size: 12px; color: var(--hint-color);">${cat.description}</div>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 20px; font-weight: 900; color: var(--primary);">${formatCompactNumber(cat.current)}</div>
                                        <div style="font-size: 10px; font-weight: 700; opacity: 0.5; text-transform: uppercase;">Total</div>
                                    </div>
                                </div>

                                <div style="margin-bottom: 25px;">
                                    <div style="display: flex; justify-content: flex-start; gap: 4px; margin-bottom: 10px;">
                                        ${cat.tiers.map((t, idx) => `
                                            <div style="flex: 1; height: 6px; border-radius: 3px; background: ${t.unlocked ? getTierColor(t.label) : 'rgba(0,0,0,0.05)'}; position: relative;">
                                                <div style="position: absolute; top: 10px; left: 0; font-size: 8px; font-weight: 800; text-transform: uppercase; color: ${t.unlocked ? getTierColor(t.label) : 'var(--hint-color)'}; opacity: ${t.unlocked ? '1' : '0.4'}">
                                                    ${t.label}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>

                                <div style="background: var(--secondary-bg-color); padding: 12px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
                                    <div style="font-size: 11px; font-weight: 700;">
                                        ${nextTier ? `Butuh <span style="color: var(--primary);">${formatCompactNumber(nextTier.value - cat.current)}</span> lagi untuk <span style="color: ${getTierColor(nextTier.label)};">${nextTier.label}</span>` : '<span style="color: var(--success);">Sudah Level Maksimal!</span>'}
                                    </div>
                                    <div style="font-size: 11px; font-weight: 800; color: var(--primary);">${Math.round(progress)}%</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Achievements UI failed:', error);
        return `<div class="card"><h3>Error</h3><p>${error.message}</p></div>`;
    }
}

/**
 * Utility functions for VesperApp WebApp
 */

export function formatCompactNumber(number) {
    if (number < 1000) return number;
    if (number >= 1000 && number < 1000000) return (number / 1000).toFixed(number % 1000 !== 0 ? 1 : 0) + 'rb';
    if (number >= 1000000 && number < 1000000000) return (number / 1000000).toFixed(number % 1000000 !== 0 ? 1 : 0) + 'jt';
    return (number / 1000000000).toFixed(number % 1000000000 !== 0 ? 1 : 0) + 'M';
}

export function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

export function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}j lalu`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}h lalu`;

    return date.toLocaleDateString('id-ID');
}

export function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function getTierColor(tier, isBg = false) {
    const colors = {
        'Bronze': '#cd7f32',
        'Silver': '#9ca3af',
        'Gold': '#facc15',
        'Platinum': '#22d3ee',
        'Maksimal': '#6366f1',
        'Belum Ada': '#71717a'
    };
    const color = colors[tier] || colors['Belum Ada'];
    return isBg ? color + '15' : color;
}


<?php
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
$version = time();
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Bot Sawer - Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <link rel="stylesheet" href="css/style.css?v=<?php echo $version; ?>">
</head>
<body>
    <div id="app">
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Memuat...</p>
        </div>

        <div class="auth-error" id="authError" style="display: none;">
            <h2>Akses Ditolak</h2>
            <p>Aplikasi ini hanya bisa diakses melalui Telegram.</p>
        </div>

        <div class="main-app" id="mainApp" style="display: none;">
            <header class="app-header">
                <!-- Animated mesh background -->
                <div class="header-mesh"></div>
                <div class="header-particles">
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                    <div class="particle"></div>
                </div>

                <div class="header-top-bar">
                    <div class="brand">
                        <div class="brand-icon">
                            <i data-lucide="zap"></i>
                        </div>
                        <h1>Bot Sawer</h1>
                    </div>
                    <div class="header-actions">
                        <button class="header-icon-btn" onclick="app.loadPage('profile')" title="Profil">
                            <i data-lucide="settings"></i>
                        </button>
                    </div>
                </div>

                <div class="header-profile-section">
                    <div class="header-avatar-ring">
                        <div id="userAvatar" class="avatar-circle"></div>
                        <div class="avatar-status-dot"></div>
                    </div>
                    <div class="header-greeting">
                        <span class="greeting-label" id="greetingText">Selamat datang 👋</span>
                        <span id="userName" class="name-display">Loading...</span>
                        <div id="userBadge" class="badge-container"></div>
                    </div>
                </div>

                <div class="header-balance-card">
                    <div class="balance-card-bg"></div>
                    <div class="balance-card-content">
                        <div class="balance-left">
                            <div class="balance-icon-wrap">
                                <i data-lucide="wallet"></i>
                            </div>
                            <div class="balance-info">
                                <span class="balance-label">Saldo Tersedia</span>
                                <span id="h-balance" class="balance-value">Rp 0</span>
                            </div>
                        </div>
                        <button class="balance-topup-btn" onclick="app.loadPage('wallet')">
                            <i data-lucide="plus"></i>
                        </button>
                    </div>
                </div>

                <!-- Wave cut bottom -->
                <div class="header-wave">
                    <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
                        <path d="M0,0 C360,60 1080,0 1440,50 L1440,60 L0,60 Z" fill="var(--secondary-bg-color)"/>
                    </svg>
                </div>
            </header>

            <nav class="app-nav">
                <button class="nav-btn active" data-page="dashboard">
                    <i data-lucide="layout-dashboard"></i>
                    Dashboard
                </button>
                <button class="nav-btn" data-page="explore">
                    <i data-lucide="search"></i>
                    Cari
                </button>
                <button class="nav-btn creator-only" data-page="contents" style="display: none;">
                    <i data-lucide="layers"></i>
                    Konten
                </button>
                <button class="nav-btn" data-page="wallet">
                    <i data-lucide="wallet"></i>
                    Dompet
                </button>
                <button class="nav-btn creator-only" data-page="creator" style="display: none;">
                    <i data-lucide="bar-chart-3"></i>
                    Statistik
                </button>
                <button class="nav-btn" data-page="profile">
                    <i data-lucide="user"></i>
                    Profil
                </button>
                <button class="nav-btn admin-only" data-page="admin" style="display: none;">
                    <i data-lucide="shield-check"></i>
                    Admin
                </button>
            </nav>

            <main class="app-content">
                <div id="pageContent">
                    <!-- Dynamic content loaded here -->
                </div>
            </main>
        </div>
    </div>

    <div id="proofModal" class="modal" style="display: none;">
        <div class="modal-overlay" onclick="app.closeProofModal()"></div>
        <div class="modal-content glass-modal">
            <div class="modal-header">
                <h3>Bukti Pembayaran</h3>
                <button class="btn-close" onclick="app.closeProofModal()">
                    <i data-lucide="x"></i>
                </button>
            </div>
            <div class="modal-body">
                <div id="proofImageLoader" class="spinner-container">
                    <div class="spinner"></div>
                </div>
                <img id="proofImage" src="" alt="Proof" style="display: none;">
            </div>
        </div>
    </div>

    <script src="js/chart.min.js?v=<?php echo $version; ?>"></script>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script src="js/telegram-web-app.js?v=<?php echo $version; ?>"></script>
    <script src="js/app.js?v=<?php echo $version; ?>"></script>
</body>
</html>
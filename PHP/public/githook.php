<?php
date_default_timezone_set("Asia/Makassar"); // set timezone

// (Opsional) cek secret biar nda sembarang orang bisa trigger
//$secret = "jalanrahasia";
//$incoming = $_GET['secret'] ?? '';
//if ($incoming !== $secret) {
//    http_response_code(403);
//    exit("Forbidden");
//}

// Ambil data dari payload GitHub
$payload = json_decode(file_get_contents('php://input'), true);
$commitMessage = $payload['head_commit']['message'] ?? 'N/A';
$pusher = $payload['pusher']['name'] ?? 'Unknown';

// Jika terpanggil manual atau payload tidak ada, ambil dari git log
if ($commitMessage === 'N/A') {
    $commitMessage = trim(shell_exec('cd /home/boxanonm/public_html/VesperApp && git log -1 --pretty=%B 2>&1'));
}

// Jalankan perintah git pull
$output = shell_exec('cd /home/boxanonm/public_html/VesperApp && git pull 2>&1');

// Simpan log ke file
file_put_contents("deploy.text", date('Y-m-d H:i:s') . " - " . $output . "\n", FILE_APPEND);

// Konfigurasi Telegram
$botToken = "7715036030:AAHlRifKGc-a1Y0b3yPdfhdnNix91C7rtvI"; // ganti dengan token bot
$chatId   = "7602143247"; // ganti dengan chat ID/grup

$repoName = "BOT SAWER";
$time     = date('Y-m-d H:i:s');

$message = "✅ Deploy sukses!\nRepo: *$repoName*\nCommit: $commitMessage\nPusher: $pusher\nWaktu: $time\n\nHasil:\n`$output`";

// Kirim request dengan cURL
$ch = curl_init("https://api.telegram.org/bot$botToken/sendMessage");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POSTFIELDS => [
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'Markdown'
    ]
]);
$response = curl_exec($ch);
curl_close($ch);

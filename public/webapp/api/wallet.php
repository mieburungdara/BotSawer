<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;
use Illuminate\Database\Capsule\Manager as DB;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../../../vendor/autoload.php';
Database::init();

// Start session for rate limiting
session_start();

// Rate limiting
$endpoint = basename(__FILE__);
// Note: $input not defined yet, use REMOTE_ADDR for rate limiting
$userId = $_SERVER['REMOTE_ADDR'];

if (!RateLimiter::check($endpoint, $userId)) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => 'Terlalu banyak request. Coba lagi nanti.',
        'retry_after' => 3600
    ]);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid request');
    }

    // Authenticate via Telegram initData
    $userId = WebAppAuth::authenticate($input);

    $action = $input['action'] ?? 'get';

    if ($action === 'withdraw') {
        // Handle withdrawal request
        $amount = $input['amount'] ?? 0;

        if ($amount <= 0) {
            throw new Exception('Jumlah penarikan harus lebih besar dari 0');
        }

        $bankName = trim($input['bankName'] ?? '');
        $bankAccount = trim($input['bankAccount'] ?? '');
        $accountName = trim($input['accountName'] ?? '');

        // Get min withdrawal from settings
        $minWithdraw = (float) DB::table('settings')
            ->where('key', 'min_withdraw')
            ->value('value') ?: 50000.00;

        if ($amount < $minWithdraw) {
            throw new Exception('Minimum penarikan Rp ' . number_format($minWithdraw, 0, ',', '.'));
        }

        if (empty($bankName) || empty($bankAccount) || empty($accountName)) {
            throw new Exception('Data rekening bank harus lengkap');
        }

        // Get platform commission rate (default 10%)
        $commissionRate = (float) DB::table('settings')
            ->where('key', 'platform_commission')
            ->value('value') ?: 10.00;

        // Calculate commission amount
        $commissionAmount = ($amount * $commissionRate) / 100;
        $finalAmount = $amount - $commissionAmount;

        // Check balance (must have enough for full amount including commission)
        $balance = Wallet::getBalance($userId);
        if ($balance < $amount) {
            throw new Exception('Saldo tidak mencukupi');
        }

        // Check if user is creator
        $creator = DB::table('users')
            ->where('id', $userId)
            ->where('is_verified', 1)
            ->first();

        if (!$creator) {
            throw new Exception('Hanya kreator yang bisa melakukan penarikan');
        }

        Database::transaction(function () use ($userId, $amount, $bankName, $bankAccount, $accountName) {
            // Deduct balance
            DB::table('wallets')->where('user_id', $userId)->decrement('balance', $amount);

            // Create transaction record
            $transactionId = DB::table('transactions')->insertGetId([
                'user_id' => $userId,
                'type' => 'withdraw',
                'amount' => $amount,
                'status' => 'pending',
                'description' => 'Pengajuan penarikan dana'
            ]);

                // Validate bank account format
                $formattedBankAccount = validateAndFormatBankAccountForWithdrawal($bankName, $bankAccount, $accountName);

                // Create withdrawal record
                DB::table('withdrawals')->insert([
                    'user_id' => $userId,
                    'amount' => $finalAmount,
                    'original_amount' => $amount,
                    'commission_rate' => $commissionRate,
                    'commission_amount' => $commissionAmount,
                    'transaction_id' => $transactionId,
                    'bank_details' => json_encode($formattedBankAccount),
                    'status' => 'pending'
                ]);

                // Audit log
                \BotSawer\AuditLogger::logAdminAction(\BotSawer\AuditLogger::ACTION_WITHDRAWAL_REQUEST, 'withdrawal', null, [], [
                    'original_amount' => $amount,
                    'commission_rate' => $commissionRate,
                    'commission_amount' => $commissionAmount,
                    'final_amount' => $finalAmount,
                    'bank_name' => $bankName,
                    'account_number' => '***MASKED***',
                    'account_name' => $accountName
                ], $userId);
        });

        Logger::info('Withdrawal request submitted', [
            'user_id' => $userId,
            'amount' => $amount,
            'bank' => $bankName
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Pengajuan penarikan berhasil diajukan. Admin akan memproses dalam 1-3 hari kerja.'
        ]);
        exit;
    }

    // Default: Get wallet data
    $wallet = DB::table('wallets')
        ->where('user_id', $userId)
        ->first();

    // Get additional stats
    $totalDonations = DB::table('transactions')
        ->where('user_id', $userId)
        ->where('type', 'donation')
        ->where('status', 'success')
        ->count();

    $totalMedia = DB::table('media_files')
        ->where('user_id', $userId)
        ->count();

    // Get platform commission rate (default 10%)
    $commissionRate = (float) DB::table('settings')
        ->where('key', 'platform_commission')
        ->value('value') ?: 10.00;

    // Get last withdrawal data for auto-fill
    $lastWithdrawal = DB::table('withdrawals')
        ->where('user_id', $userId)
        ->orderBy('created_at', 'desc')
        ->first();
    
    $lastWithdrawalData = null;
    if ($lastWithdrawal && !empty($lastWithdrawal->bank_details)) {
        $lastWithdrawalData = json_decode($lastWithdrawal->bank_details, true);
    }

    // Get min withdrawal for UI
    $minWithdraw = (float) DB::table('settings')
        ->where('key', 'min_withdraw')
        ->value('value') ?: 50000.00;

    echo json_encode([
        'success' => true,
        'data' => [
            'balance' => $wallet ? (int)$wallet->balance : 0,
            'total_deposit' => $wallet ? (int)$wallet->total_deposit : 0,
            'total_withdraw' => $wallet ? (int)$wallet->total_withdraw : 0,
            'total_donations' => $totalDonations,
            'total_media' => $totalMedia,
            'commission_rate' => $commissionRate,
            'min_withdraw' => $minWithdraw,
            'last_withdrawal' => $lastWithdrawalData
        ]
    ]);

} catch (Exception $e) {
    Logger::logApiError('wallet.php', $_POST, $e);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function validateAndFormatBankAccountForWithdrawal(string $bankName, string $accountNumber, string $accountName): array
{
    // Validate bank name (must be one of supported banks)
    $supportedBanks = [
        'SHOPEEPAY', 'DANA', 'GOPAY'
    ];

    $bankNameUpper = strtoupper($bankName);
    if (!in_array($bankNameUpper, $supportedBanks)) {
        throw new Exception('E-Wallet tidak didukung. Gunakan salah satu: ' . implode(', ', $supportedBanks));
    }

    // Validate account number (must be numeric, 10-20 digits)
    if (!preg_match('/^\d{10,20}$/', $accountNumber)) {
        throw new Exception('Nomor rekening harus berupa angka 10-20 digit');
    }

    // Validate account holder name (must be alphabetic, 3-50 chars, no special chars)
    if (!preg_match('/^[a-zA-Z\s]{3,50}$/', $accountName)) {
        throw new Exception('Nama pemilik rekening harus berupa huruf 3-50 karakter');
    }

    // Check if account name matches user profile (basic validation)
    // This is optional but recommended for security

    return [
        'bank_name' => $bankNameUpper,
        'account_number' => $accountNumber,
        'account_name' => ucwords(strtolower($accountName))
    ];
}
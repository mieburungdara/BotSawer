<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../../vendor/autoload.php';
Database::init();

// Start session for rate limiting
session_start();

// Rate limiting
$endpoint = basename(__FILE__);
$userId = $input['userId'] ?? $_SERVER['REMOTE_ADDR'];

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

    if (!$input || !isset($input['userId'])) {
        throw new Exception('Invalid request');
    }

    $userId = $input['userId'];
    $action = $input['action'] ?? 'get';

    if ($action === 'withdraw') {
        // Handle withdrawal request
        $amount = $input['amount'] ?? 0;
        $bankName = trim($input['bankName'] ?? '');
        $bankAccount = trim($input['bankAccount'] ?? '');
        $accountName = trim($input['accountName'] ?? '');

        if ($amount < 50000) {
            throw new Exception('Minimum penarikan Rp 50.000');
        }

        if (empty($bankName) || empty($bankAccount) || empty($accountName)) {
            throw new Exception('Data rekening bank harus lengkap');
        }

        // Get platform commission rate (default 10%)
        $commissionRate = (float) \Illuminate\Database\Capsule\Manager::table('settings')
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
        $creator = \Illuminate\Database\Capsule\Manager::table('creators')
            ->where('user_id', $userId)
            ->first();

        if (!$creator) {
            throw new Exception('Hanya kreator yang bisa melakukan penarikan');
        }

        Database::transaction(function () use ($userId, $amount, $bankName, $bankAccount, $accountName) {
            // Deduct balance
            \Illuminate\Database\Capsule\Manager::table('wallets')->where('user_id', $userId)->decrement('balance', $amount);

            // Create transaction record
            $transactionId = \Illuminate\Database\Capsule\Manager::table('transactions')->insertGetId([
                'user_id' => $userId,
                'type' => 'withdraw',
                'amount' => $amount,
                'status' => 'pending',
                'description' => 'Pengajuan penarikan dana'
            ]);

                // Validate bank account format
                $formattedBankAccount = validateAndFormatBankAccountForWithdrawal($bankName, $bankAccount, $accountName);

                // Create withdrawal record
                \Illuminate\Database\Capsule\Manager::table('withdrawals')->insert([
                    'creator_id' => $userId,
                    'amount' => $finalAmount,
                    'original_amount' => $amount,
                    'commission_rate' => $commissionRate,
                    'commission_amount' => $commissionAmount,
                    'transaction_id' => $transactionId,
                    'bank_details' => json_encode($formattedBankAccount),
                    'status' => 'pending'
                ]);

                // Audit log
                \BotSawer\AuditLogger::log(\BotSawer\AuditLogger::ACTION_WITHDRAWAL_REQUEST, 'withdrawal', $userId, [], [
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
    $wallet = \Illuminate\Database\Capsule\Manager::table('wallets')
        ->where('user_id', $userId)
        ->first();

    // Get additional stats
    $totalDonations = \Illuminate\Database\Capsule\Manager::table('transactions')
        ->where('user_id', $userId)
        ->where('type', 'donation')
        ->where('status', 'success')
        ->count();

    $totalMedia = \Illuminate\Database\Capsule\Manager::table('media_files')
        ->where('creator_id', $userId)
        ->count();

    echo json_encode([
        'success' => true,
        'data' => [
            'balance' => $wallet ? (int)$wallet->balance : 0,
            'total_deposit' => $wallet ? (int)$wallet->total_deposit : 0,
            'total_withdraw' => $wallet ? (int)$wallet->total_withdraw : 0,
            'total_donations' => $totalDonations,
            'total_media' => $totalMedia
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
        'BCA', 'MANDIRI', 'BRI', 'BNI', 'CIMB', 'DANAMON', 'PERMATA', 'BSI',
        'OCBC', 'MAYBANK', 'PANIN', 'MEGA', 'BUKOPIN', 'SAHABAT SAMPOERNA'
    ];

    $bankNameUpper = strtoupper($bankName);
    if (!in_array($bankNameUpper, $supportedBanks) && !str_contains($bankNameUpper, 'LAINNYA')) {
        throw new Exception('Nama bank tidak didukung. Gunakan salah satu: ' . implode(', ', $supportedBanks));
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
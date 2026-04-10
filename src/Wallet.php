<?php

declare(strict_types=1);

namespace BotSawer;

use Illuminate\Database\Capsule\Manager as DB;
use Exception;

class Wallet
{
    public static function addBalance(int $userId, float $amount, string $description = ''): bool
    {
        if ($amount <= 0) {
            throw new Exception('Jumlah nominal harus lebih besar dari 0');
        }

        return Database::transaction(function () use ($userId, $amount, $description) {
            $wallet = DB::table('wallets')->where('user_id', $userId)->lockForUpdate()->first();

            if (!$wallet) {
                throw new Exception('Wallet pengguna tidak ditemukan');
            }

            DB::table('wallets')->where('user_id', $userId)->update([
                'balance' => DB::raw("balance + $amount"),
                'total_deposit' => DB::raw("total_deposit + $amount")
            ]);

            DB::table('transactions')->insert([
                'user_id' => $userId,
                'type' => 'deposit',
                'amount' => $amount,
                'status' => 'success',
                'description' => $description
            ]);

            return true;
        });
    }

    public static function deductBalance(int $userId, float $amount, string $description = ''): bool
    {
        if ($amount <= 0) {
            throw new Exception('Jumlah nominal harus lebih besar dari 0');
        }

        return Database::transaction(function () use ($userId, $amount, $description) {
            $wallet = DB::table('wallets')->where('user_id', $userId)->lockForUpdate()->first();

            if (!$wallet) {
                throw new Exception('Wallet pengguna tidak ditemukan');
            }

            if ($wallet->balance < $amount) {
                throw new Exception('Saldo tidak mencukupi');
            }

            DB::table('wallets')->where('user_id', $userId)->update([
                'balance' => DB::raw("balance - $amount"),
                'total_withdraw' => DB::raw("total_withdraw + $amount")
            ]);

            DB::table('transactions')->insert([
                'user_id' => $userId,
                'type' => 'withdraw',
                'amount' => $amount,
                'status' => 'success',
                'description' => $description
            ]);

            return true;
        });
    }

    public static function getBalance(int $userId): float
    {
        $wallet = DB::table('wallets')->where('user_id', $userId)->first();
        return $wallet ? (float) $wallet->balance : 0;
    }
}
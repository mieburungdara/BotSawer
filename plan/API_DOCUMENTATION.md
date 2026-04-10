# BotSawer API Documentation

## Overview
BotSawer provides RESTful APIs for webapp integration with Telegram Mini Apps.

## Authentication
All API requests require authentication via Telegram Web App data.

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "userId": 123,
  "initData": "telegram_init_data_here",
  "action": "specific_action",
  ...other parameters
}
```

## Endpoints

### 1. Authentication (`/api/auth.php`)
Validates Telegram Web App authentication.

**Method:** POST

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "telegram_id": 123456789,
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "is_admin": false,
    "is_creator": true
  }
}
```

### 2. Wallet Management (`/api/wallet.php`)
Manage user wallet and transactions.

**Method:** POST

**Actions:**
- `get`: Get wallet info (default)
- `withdraw`: Request withdrawal

**Request for withdrawal:**
```json
{
  "userId": 123,
  "action": "withdraw",
  "amount": 50000,
  "bankName": "BCA",
  "bankAccount": "1234567890",
  "accountName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balance": 150000,
    "total_deposit": 200000,
    "total_withdraw": 50000
  }
}
```

### 3. Transaction History (`/api/transactions.php`)
Get user transaction history.

**Method:** POST

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "donation",
      "amount": 10000,
      "description": "Donasi dari sawer",
      "status": "success",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### 4. Creator Dashboard (`/api/creator.php`)
Creator-specific data and analytics.

**Method:** POST

**Actions:**
- `get`: Get dashboard data (default)
- `update_profile`: Update creator profile

**Response:**
```json
{
  "success": true,
  "data": {
    "profile": {
      "display_name": "John Creator",
      "bio": "Content creator",
      "bank_account": "BCA - 1234567890"
    },
    "stats": {
      "total_media": 10,
      "total_earnings": 500000,
      "total_donations": 50
    },
    "analytics": {
      "donations_last_7_days": [...],
      "donations_by_amount": [...]
    }
  }
}
```

### 5. Admin Panel (`/api/admin.php`)
Administrative functions (admin only).

**Method:** POST

**Actions:**
- `stats`: System statistics
- `search_users`: Search users
- `adjust_balance`: Adjust user balance
- `ban_user`: Ban/unban user
- `get_settings`: Get system settings
- `update_setting`: Update setting
- `get_audit_logs`: Get audit logs
- `get_bots`: Get bot list
- `add_bot`: Add new bot
- `toggle_bot`: Activate/deactivate bot

**Example - Get Stats:**
```json
{
  "userId": 1,
  "action": "stats"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 100,
    "total_transactions": 500,
    "total_balance": 10000000,
    "pending_topups": 5,
    "pending_withdrawals": 3
  }
}
```

## Error Handling

All endpoints return errors in this format:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Rate Limiting

- Authentication: 10 requests/hour
- Wallet: 30 requests/hour
- Transactions: 20 requests/hour
- Creator: 20 requests/hour
- Admin: 50 requests/hour

Rate limited requests return HTTP 429 with:
```json
{
  "success": false,
  "message": "Terlalu banyak request. Coba lagi nanti.",
  "retry_after": 3600
}
```

## Status Codes

- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `429`: Too Many Requests
- `500`: Internal Server Error

## Health Check

**Endpoint:** `/health.php`

**Method:** GET

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00+00:00",
  "version": "1.0.0",
  "metrics": {
    "database": "connected",
    "total_users": 100,
    "total_creators": 20,
    "total_media": 150,
    "total_transactions": 500,
    "pending_withdrawals": 3,
    "pending_topups": 2
  }
}
```

## Webhook

**Endpoint:** `/webhook.php?secret=webhook_secret`

**Method:** POST

**Body:** Telegram update JSON

Handles incoming messages, callbacks, and inline queries from Telegram.
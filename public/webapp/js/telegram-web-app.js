// Telegram Web App API utilities
class TelegramWebApp {
    constructor() {
        this.initData = null;
        this.user = null;
        this.init();
    }

    init() {
        if (window.Telegram && window.Telegram.WebApp) {
            this.initData = window.Telegram.WebApp.initData;
            this.user = window.Telegram.WebApp.initDataUnsafe?.user;
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }
    }

    isValid() {
        return this.initData && this.user;
    }

    getUserId() {
        return this.user?.id;
    }

    getUserData() {
        return this.user;
    }

    getInitData() {
        return this.initData;
    }

    validateInitData(botToken) {
        // Basic validation - in production, validate on server
        return this.isValid();
    }

    showAlert(message) {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.showAlert(message);
        } else {
            alert(message);
        }
    }

    close() {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.close();
        }
    }
}
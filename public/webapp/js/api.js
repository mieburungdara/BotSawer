/**
 * API function for BotSawer WebApp
 */
export async function apiCall(app, endpoint, data = {}) {
    const response = await fetch(`api/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...data,
            botId: app.botId,
            userId: app.userData?.id || app.telegram.getUserId(),
            initData: app.telegram.getInitData()
        })
    });

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || 'API call failed');
    }
    return result.data;
}

/**
 * API function for VesperApp WebApp
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
            userId: (app.userData ? app.userData.id : null) || (app.telegram && app.telegram.initDataUnsafe && app.telegram.initDataUnsafe.user ? app.telegram.initDataUnsafe.user.id : null),
            initData: app.telegram ? app.telegram.initData : null
        })
    });

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || 'API call failed');
    }
    return result.data;
}


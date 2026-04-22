/**
 * Settings Page Module
 */
export async function loadSettings(app) {
    try {
        const result = await app.apiCall('admin.php', {
            action: 'get_settings'
        });

        displaySettings(app, result);
    } catch (error) {
        app.telegram.showAlert('Error loading settings: ' + error.message);
    }
}

export function displaySettings(app, settings) {
    const container = document.getElementById('settingsContainer');

    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    Object.values(settings).forEach(setting => {
        html += `
            <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #eee; border-radius: 8px;">
                <div style="margin-bottom: 5px;">
                    <strong>${setting.key}</strong>
                    <br><small style="color: #666;">${setting.description}</small>
                </div>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="setting_${setting.key}" value="${setting.value || ''}" style="flex: 1;">
                    <button class="btn btn-sm btn-primary" onclick="app.updateSetting('${setting.key}')">Update</button>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

export async function updateSetting(app, key) {
    const value = document.getElementById(`setting_${key}`).value;

    try {
        const result = await app.apiCall('admin.php', {
            action: 'update_setting',
            key: key,
            value: value
        });

        app.telegram.showAlert(result.message);
    } catch (error) {
        app.telegram.showAlert('Error updating setting: ' + error.message);
    }
}

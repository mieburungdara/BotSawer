const ServerManager = require('./SSH/ServerManager');
const fs = require('fs');
const path = require('path');

const sshConfig = {
    host: 'lucky.jagoanhosting.id',
    port: 45022,
    username: 'boxanonm',
    privateKey: fs.readFileSync(path.join(__dirname, 'SSH', 'id_rsa')),
    passphrase: 'Reza_1234_'
};

async function getLogs() {
    const server = new ServerManager(sshConfig);
    try {
        await server.connect();
        const res = await server.exec('tail -n 100 /home/boxanonm/.pm2/logs/server.js-out.log');
        console.log(res.output);
    } catch (e) {
        console.error(e);
    } finally {
        server.disconnect();
    }
}
getLogs();

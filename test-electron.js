// Minimal electron test
const electron = require('electron');
console.log('typeof electron:', typeof electron);
console.log('electron value:', electron);

if (typeof electron === 'string') {
    console.log('ERROR: electron is a path string, not the electron module');
    console.log('This means Electron is not running correctly.');
    console.log('Please try: npm cache clean --force && npm install');
    process.exit(1);
}

const { app, BrowserWindow } = electron;

app.whenReady().then(() => {
    const win = new BrowserWindow({ width: 800, height: 600 });
    win.loadURL('data:text/html,<h1>Electron Works!</h1>');
});

app.on('window-all-closed', () => app.quit());

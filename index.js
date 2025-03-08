const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;
const BLOCKLIST_FILE = '/etc/dnsmasq.d/blocklist.conf';

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Load blocked sites
const loadBlocklist = () => {
    if (!fs.existsSync(BLOCKLIST_FILE)) return [];
    const op = fs.readFileSync(BLOCKLIST_FILE, 'utf-8').split('\n').filter(Boolean);
    console.log(op);
    return op;
};


// Save blocked sites
const saveBlocklist = (blocklist) => {
    fs.writeFileSync(BLOCKLIST_FILE, blocklist.join('\n'));
    exec('systemctl restart dnsmasq', (error) => {
        if (error) console.error('Failed to restart dnsmasq:', error);
    });
};

// // Homepage
app.get('/', (req, res) => {
    res.render('index', { blocklist: loadBlocklist() });
});

// // Add site to blocklist
app.post('/block', (req, res) => {
    const site = req.body.site.trim();
    if (site) {
        const blocklist = new Set(loadBlocklist());
        blocklist.add(`address=/${site}/0.0.0.0`);
        saveBlocklist([...blocklist]);
    }
    res.redirect('/');
});

// Remove site from blocklist
app.post('/unblock', (req, res) => {
    const site = req.body.site.trim();
    const blocklist = loadBlocklist().filter(s => !s.includes(site));
    saveBlocklist(blocklist);
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

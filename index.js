const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const PORT = 3000;
const BLOCKLIST_FILE = '/etc/dnsmasq.d/blocklist.conf';
const CONFIG_FILE = '/etc/dnsmasq.conf';


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


// Check for line in conf file
function ensureLineExists(config, line) {
  return config.split("\n").some(l => l.trim() === line);
}

fs.readFile(CONFIG_FILE, "utf8", (err, config) => {
  if (err) {
    console.error("Failed to read dnsmasq.conf:", err.message);
    return;
  }

  let updated = false;

  if (!ensureLineExists(config, "log-facility=/var/log/dnsmasq.log")) {
    config += `\nlog-facility=/var/log/dnsmasq.log`;
    updated = true;
  }

  if (!ensureLineExists(config, "log-queries")) {
    config += `\n$log-queries`;
    updated = true;
  }

  if (updated) {
    fs.writeFile(CONFIG_FILE, config, "utf8", (err) => {
      if (err) {
        console.error("Failed to write dnsmasq.conf:", err.message);
        return;
      }

      console.log("Updated dnsmasq.conf with log settings.");
      console.log("Restarting dnsmasq...");

      exec("systemctl restart dnsmasq", (err, stdout, stderr) => {
        if (err) {
          console.error("Failed to restart dnsmasq:", stderr.trim());
          return;
        }
        console.log("dnsmasq restarted successfully.");
      });
    });
  } else {
    console.log("dnsmasq.conf already has the required logging settings.");
  }
});

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

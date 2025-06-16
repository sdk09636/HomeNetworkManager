const express = require('express');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const readline = require("readline");
const http = require("http");
const socketIO = require("socket.io");
const os = require('os');

const app = express();
const PORT = 3000;
const BLOCKLIST_FILE = '/etc/dnsmasq.d/blocklist.conf';
const CONFIG_FILE = '/etc/dnsmasq.conf';

const server = http.createServer(app);
const io = socketIO(server);


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


// Check for a line in a file
function ensureLineExists(config, line) {
  return config.split("\n").some(l => l.trim() === line);
}

// Check if log-queries is on in dnsmasq.conf, if not then turn it on.
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
    config += `\nlog-queries`;
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

      exec("sudo systemctl restart dnsmasq", (err, stdout, stderr) => {
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

// Monitor Requests to dnsmasq

const tail = spawn("tail", ["-F", "/var/log/dnsmasq.log"]);

const rl = readline.createInterface({
  input: tail.stdout,
  output: process.stdout,
  terminal: false,
});

const blockedDomains = loadBlocklist().map(line => {
      const match = line.match(/\/([^/]+)\//);
      return match ? match[1] : null;
    })
    .filter(Boolean);

rl.on("line", line => {
  for (const domain of blockedDomains) {
    if (line.includes(domain)) {
      io.emit("dnsLog", line);
      console.log(line);
      break;
    }
  }
});

tail.stderr.on("data", data => {
  console.error(`tail stderr: ${data}`);
});

// Host Discovery

function loadNetInterfaces() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {  
        addresses.push(name);
      }
    }
  }
  console.log(addresses);
  return addresses;
}

// function hostDicovery() {
  
// }

// // Homepage
app.get('/', (req, res) => {
    res.render('index', { blocklist: loadBlocklist(), interfaces: loadNetInterfaces()});
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

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

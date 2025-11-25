const { WebSocketServer } = require('ws');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');
const os = require('os');

const PORT = 8888;
const SECRET_TOKEN = "bff-alpha-token";
const SAVE_FILE = path.join(__dirname, 'playground.json');

const wss = new WebSocketServer({ port: PORT });

const sandbox = {
    require: require, 
    process: process,
    Buffer: Buffer,
    console: {
        log: (...args) => broadcastLog('log', args),
        error: (...args) => broadcastLog('error', args),
        warn: (...args) => broadcastLog('warn', args)
    },
    setTimeout, clearTimeout, setInterval, clearInterval
};

vm.createContext(sandbox);

function broadcastLog(level, args) {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
    wss.clients.forEach(c => c.readyState === 1 && c.send(JSON.stringify({ type: 'log', level, content: msg })));
}

function runPiston(language, code, callback) {
    const postData = JSON.stringify({ language, version: "*", files: [{ content: code }] });
    const options = { hostname: 'emkc.org', path: '/api/v2/piston/execute', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length } };
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                if (response.run) callback(null, response.run.output);
                else callback(new Error(response.message || "API Error"));
            } catch (e) { callback(e); }
        });
    });
    req.on('error', (e) => callback(e));
    req.write(postData);
    req.end();
}

function tryParseJSON(str) {
    try { return JSON.parse(str); } catch (e) {
        try { return JSON.parse(str.trim().split('\n').pop()); } catch (e2) { return str; }
    }
}

function getExtension(lang) {
    const map = { javascript: 'js', python: 'py', go: 'go', rust: 'rs', java: 'java', php: 'php', csharp: 'cs', typescript: 'ts' };
    return map[lang] || 'txt';
}

wss.on('connection', (ws) => {
    if (fs.existsSync(SAVE_FILE)) {
        try { ws.send(JSON.stringify({ type: 'LOAD_DATA', cells: JSON.parse(fs.readFileSync(SAVE_FILE)) })); } catch(e){}
    }

    ws.on('message', async (message) => {
        let data;
        try { data = JSON.parse(message); } catch (e) { return; }
        if (data.token !== SECRET_TOKEN) return;

        if (data.command === 'EXECUTE') {
            const { cellId, code, language } = data;
            const lang = language || 'javascript';

            if (lang === 'javascript') {
                try {
                    if (code.trim().startsWith('!')) {
                        exec(code.trim().substring(1), { cwd: process.cwd() }, (err, stdout, stderr) => {
                             ws.send(JSON.stringify({ type: err ? 'error' : 'result', cellId, content: err ? err.message : (stdout+stderr).trim() }));
                        });
                        return;
                    }
                    const result = await vm.runInContext(`(async()=>{${code}})()`, sandbox);
                    ws.send(JSON.stringify({ type: 'result', cellId, content: result }));
                } catch (e) { ws.send(JSON.stringify({ type: 'error', cellId, content: e.message })); }
            } else {
                let pistonLang = lang;
                if (lang === 'csharp') pistonLang = 'csharp';
                runPiston(pistonLang, code, (err, output) => {
                    if (err) ws.send(JSON.stringify({ type: 'error', cellId, content: "Cloud Error: " + err.message }));
                    else ws.send(JSON.stringify({ type: 'result', cellId, content: tryParseJSON(output ? output.trim() : "") }));
                });
            }
        }

        if (data.command === 'SAVE') {
            fs.writeFileSync(SAVE_FILE, JSON.stringify(data.cells, null, 2));
            ws.send(JSON.stringify({ type: 'log', content: 'Saved to disk!' }));
        }

        if (data.command === 'LOAD' && fs.existsSync(SAVE_FILE)) {
            ws.send(JSON.stringify({ type: 'LOAD_DATA', cells: JSON.parse(fs.readFileSync(SAVE_FILE)) }));
        }

        if (data.command === 'EXPORT') {
            try {
                const exportDir = path.join(__dirname, `exports_${Date.now()}`);
                fs.mkdirSync(exportDir);
                
                let count = 0;
                data.cells.forEach(cell => {
                    const ext = getExtension(cell.language || 'javascript');
                    const finalExt = (cell.type === 'frontend') ? 'jsx' : ext;
                    
                    let fname = cell.filename;
                    if (!fname || fname.trim() === '') {
                        fname = `cell_${cell.id}.${finalExt}`;
                    }
                    
                    fs.writeFileSync(path.join(exportDir, fname), cell.code);
                    count++;
                });
                
                console.log(`Exported ${count} files to ${exportDir}`);
                ws.send(JSON.stringify({ type: 'log', content: `Successfully exported to /${path.basename(exportDir)}` }));
            } catch (e) {
                ws.send(JSON.stringify({ type: 'error', content: "Export failed: " + e.message }));
            }
        }
    });
});
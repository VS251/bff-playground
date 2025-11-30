const { WebSocketServer } = require('ws');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

const PORT = 8888;
const SECRET_TOKEN = "bff-alpha-token";
const SAVE_FILE = path.join(__dirname, 'playground.json');
const ENV_FILE = path.join(__dirname, '.env');

const wss = new WebSocketServer({ port: PORT });

// Load environment variables from .env file into process.env
function loadEnvFile() {
    if (fs.existsSync(ENV_FILE)) {
        const envContent = fs.readFileSync(ENV_FILE, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key) {
                    const value = valueParts.join('=').trim();
                    const cleanValue = value.replace(/^["']|["']$/g, '');
                    process.env[key.trim()] = cleanValue;
                }
            }
        });
    }
}

// Parse .env file and return array of key-value pairs
function parseEnvFile() {
    if (!fs.existsSync(ENV_FILE)) {
        return [];
    }
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    const vars = [];
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
                const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                vars.push({ key: key.trim(), value });
            }
        }
    });
    return vars;
}

// Get environment variables with masked values for display
function getEnvVars() {
    const vars = parseEnvFile();
    return vars.map(v => ({
        key: v.key,
        masked: v.value.length > 4 
            ? v.value.substring(0, 4) + '•'.repeat(Math.min(v.value.length - 4, 12))
            : '•'.repeat(v.value.length)
    }));
}

// Add or update an environment variable
function addEnvVar(key, value) {
    try {
        // Read existing variables
        let vars = parseEnvFile();
        
        // Check if key already exists
        const existingIndex = vars.findIndex(v => v.key === key);
        
        if (existingIndex !== -1) {
            // Update existing key
            vars[existingIndex].value = value;
        } else {
            // Add new key
            vars.push({ key, value });
        }
        
        // Write back to file
        const lines = vars.map(v => `${v.key}=${v.value}`);
        fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');
        
        // Reload environment variables
        loadEnvFile();
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Delete an environment variable
function deleteEnvVar(key) {
    try {
        if (!fs.existsSync(ENV_FILE)) {
            return { success: false, error: '.env file not found' };
        }
        
        // Read existing variables
        let vars = parseEnvFile();
        
        // Filter out the key to delete
        vars = vars.filter(v => v.key !== key);
        
        // Write back to file
        const lines = vars.map(v => `${v.key}=${v.value}`);
        fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');
        
        // Remove from process.env
        delete process.env[key];
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Load environment variables on startup
loadEnvFile();

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
    const options = { 
        hostname: 'emkc.org', 
        path: '/api/v2/piston/execute', 
        method: 'POST', 
        headers: { 
            'Content-Type': 'application/json', 
            'Content-Length': postData.length 
        } 
    };
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
    try { 
        return JSON.parse(str); 
    } catch (e) {
        try { 
            return JSON.parse(str.trim().split('\n').pop()); 
        } catch (e2) { 
            return str; 
        }
    }
}

function getExtension(lang) {
    const map = { 
        javascript: 'js', 
        python: 'py', 
        go: 'go', 
        rust: 'rs', 
        java: 'java', 
        php: 'php', 
        csharp: 'cs', 
        typescript: 'ts' 
    };
    return map[lang] || 'txt';
}

wss.on('connection', (ws) => {
    // Load saved project on connection
    if (fs.existsSync(SAVE_FILE)) {
        try { 
            ws.send(JSON.stringify({ 
                type: 'LOAD_DATA', 
                cells: JSON.parse(fs.readFileSync(SAVE_FILE)) 
            })); 
        } catch(e) {
            console.error('Failed to load saved project:', e);
        }
    }

    ws.on('message', async (message) => {
        let data;
        try { 
            data = JSON.parse(message); 
        } catch (e) { 
            return; 
        }
        
        // Verify token
        if (data.token !== SECRET_TOKEN) return;

        // ===================================
        // EXECUTE CODE IN CELLS
        // ===================================
        if (data.command === 'EXECUTE') {
            const { cellId, code, language } = data;
            const lang = language || 'javascript';

            if (lang === 'javascript') {
                try {
                    // Shell command execution (starts with !)
                    if (code.trim().startsWith('!')) {
                        exec(code.trim().substring(1), { cwd: process.cwd() }, (err, stdout, stderr) => {
                            ws.send(JSON.stringify({ 
                                type: err ? 'error' : 'result', 
                                cellId, 
                                content: err ? err.message : (stdout + stderr).trim() 
                            }));
                        });
                        return;
                    }
                    
                    // Regular JavaScript execution
                    const result = await vm.runInContext(`(async()=>{${code}})()`, sandbox);
                    ws.send(JSON.stringify({ type: 'result', cellId, content: result }));
                } catch (e) { 
                    ws.send(JSON.stringify({ type: 'error', cellId, content: e.message })); 
                }
            } else {
                // Cloud execution via Piston
                let pistonLang = lang;
                if (lang === 'csharp') pistonLang = 'csharp';
                
                runPiston(pistonLang, code, (err, output) => {
                    if (err) {
                        ws.send(JSON.stringify({ 
                            type: 'error', 
                            cellId, 
                            content: "Cloud Error: " + err.message 
                        }));
                    } else {
                        ws.send(JSON.stringify({ 
                            type: 'result', 
                            cellId, 
                            content: tryParseJSON(output ? output.trim() : "") 
                        }));
                    }
                });
            }
        }

        // ===================================
        // SAVE PROJECT
        // ===================================
        if (data.command === 'SAVE') {
            try {
                fs.writeFileSync(SAVE_FILE, JSON.stringify(data.cells, null, 2));
                ws.send(JSON.stringify({ type: 'log', content: 'Project saved to disk!' }));
            } catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    content: 'Failed to save: ' + e.message 
                }));
            }
        }

        // ===================================
        // LOAD PROJECT
        // ===================================
        if (data.command === 'LOAD' && fs.existsSync(SAVE_FILE)) {
            try {
                ws.send(JSON.stringify({ 
                    type: 'LOAD_DATA', 
                    cells: JSON.parse(fs.readFileSync(SAVE_FILE)) 
                }));
            } catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    content: 'Failed to load: ' + e.message 
                }));
            }
        }

        // ===================================
        // ENVIRONMENT VARIABLES - GET LIST
        // ===================================
        if (data.command === 'GET_ENV_VARS') {
            try {
                const vars = getEnvVars();
                ws.send(JSON.stringify({ 
                    type: 'ENV_VARS_LIST', 
                    vars: vars 
                }));
            } catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'ENV_ERROR', 
                    message: 'Failed to load environment variables: ' + e.message 
                }));
            }
        }

        // ===================================
        // ENVIRONMENT VARIABLES - ADD/UPDATE
        // ===================================
        if (data.command === 'ADD_ENV_VAR') {
            try {
                const { key, value } = data;
                
                // Validate input
                if (!key || !value) {
                    ws.send(JSON.stringify({ 
                        type: 'ENV_ERROR', 
                        message: 'Key and value are required' 
                    }));
                    return;
                }
                
                // Validate key format
                if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
                    ws.send(JSON.stringify({ 
                        type: 'ENV_ERROR', 
                        message: 'Key must contain only letters, numbers, and underscores' 
                    }));
                    return;
                }
                
                const result = addEnvVar(key, value);
                
                if (result.success) {
                    ws.send(JSON.stringify({ 
                        type: 'ENV_VAR_ADDED', 
                        key: key 
                    }));
                    console.log(`✅ Added environment variable: ${key}`);
                } else {
                    ws.send(JSON.stringify({ 
                        type: 'ENV_ERROR', 
                        message: result.error 
                    }));
                }
            } catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'ENV_ERROR', 
                    message: 'Failed to add variable: ' + e.message 
                }));
            }
        }

        // ===================================
        // ENVIRONMENT VARIABLES - DELETE
        // ===================================
        if (data.command === 'DELETE_ENV_VAR') {
            try {
                const { key } = data;
                
                if (!key) {
                    ws.send(JSON.stringify({ 
                        type: 'ENV_ERROR', 
                        message: 'Key is required' 
                    }));
                    return;
                }
                
                const result = deleteEnvVar(key);
                
                if (result.success) {
                    ws.send(JSON.stringify({ 
                        type: 'ENV_VAR_DELETED', 
                        key: key 
                    }));
                    console.log(`🗑️  Deleted environment variable: ${key}`);
                } else {
                    ws.send(JSON.stringify({ 
                        type: 'ENV_ERROR', 
                        message: result.error 
                    }));
                }
            } catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'ENV_ERROR', 
                    message: 'Failed to delete variable: ' + e.message 
                }));
            }
        }

        // ===================================
        // LEGACY: GET_SECRETS (backward compatibility)
        // ===================================
        if (data.command === 'GET_SECRETS') {
            try {
                const secrets = parseEnvFile();
                ws.send(JSON.stringify({ type: 'SECRETS_DATA', secrets }));
            } catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    content: 'Failed to load secrets: ' + e.message 
                }));
            }
        }

        // ===================================
        // LEGACY: SAVE_SECRETS (backward compatibility)
        // ===================================
        if (data.command === 'SAVE_SECRETS') {
            try {
                const lines = data.secrets.map(s => `${s.key}=${s.value}`);
                fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');
                loadEnvFile();
                ws.send(JSON.stringify({ type: 'log', content: 'Secrets saved to .env file!' }));
                ws.send(JSON.stringify({ type: 'SECRETS_SAVED' }));
            } catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    content: 'Failed to save secrets: ' + e.message 
                }));
            }
        }

        // ===================================
        // EXPORT PROJECT
        // ===================================
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
                
                // Copy .env file to export if it exists
                if (fs.existsSync(ENV_FILE)) {
                    fs.copyFileSync(ENV_FILE, path.join(exportDir, '.env'));
                    console.log('📋 Copied .env file to export');
                }
                
                console.log(`📦 Exported ${count} files to ${exportDir}`);
                ws.send(JSON.stringify({ 
                    type: 'log', 
                    content: `Successfully exported to /${path.basename(exportDir)}` 
                }));
            } catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    content: "Export failed: " + e.message 
                }));
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 BFF Playground Bridge Server');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📡 WebSocket: ws://localhost:${PORT}`);
console.log(`📁 Save file: ${SAVE_FILE}`);
console.log(`🔐 Environment: ${ENV_FILE}`);
console.log(`🔑 Token: ${SECRET_TOKEN}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Ready for connections...\n');
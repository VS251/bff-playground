const { WebSocketServer } = require('ws');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

const PORT = 8888;
const SECRET_TOKEN = "bff-alpha-token";

let CURRENT_PROJECT = 'default';
const SAVE_FILE = () => path.join(__dirname, `${CURRENT_PROJECT}.playground.json`);
const ENV_FILE = path.join(__dirname, '.env');

const wss = new WebSocketServer({ port: PORT });

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

function getEnvVars() {
    const vars = parseEnvFile();
    return vars.map(v => ({
        key: v.key,
        masked: v.value.length > 4 
            ? v.value.substring(0, 4) + '•'.repeat(Math.min(v.value.length - 4, 12))
            : '•'.repeat(v.value.length)
    }));
}

function addEnvVar(key, value) {
    try {
        
        let vars = parseEnvFile();
        
        const existingIndex = vars.findIndex(v => v.key === key);
        
        if (existingIndex !== -1) {
            vars[existingIndex].value = value;
        } else {
            vars.push({ key, value });
        }
        
        const lines = vars.map(v => `${v.key}=${v.value}`);
        fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');
        
        loadEnvFile();
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function deleteEnvVar(key) {
    try {
        if (!fs.existsSync(ENV_FILE)) {
            return { success: false, error: '.env file not found' };
        }
        
        let vars = parseEnvFile();
        
        vars = vars.filter(v => v.key !== key);
        
        const lines = vars.map(v => `${v.key}=${v.value}`);
        fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');
        
        delete process.env[key];
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function listProjects() {
    try {
        const files = fs.readdirSync(__dirname);
        const projects = files
            .filter(f => f.endsWith('.playground.json'))
            .map(f => f.replace('.playground.json', ''));
        
        if (!projects.includes('default') && fs.existsSync(path.join(__dirname, 'playground.json'))) {
            fs.renameSync(
                path.join(__dirname, 'playground.json'),
                path.join(__dirname, 'default.playground.json')
            );
            projects.push('default');
        }
        
        return projects.length > 0 ? projects : ['default'];
    } catch (error) {
        console.error('Error listing projects:', error);
        return ['default'];
    }
}

function createProject(projectName) {
    try {
        if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
            return { 
                success: false, 
                error: 'Project name can only contain letters, numbers, hyphens, and underscores' 
            };
        }
        
        const projectFile = path.join(__dirname, `${projectName}.playground.json`);
        
        if (fs.existsSync(projectFile)) {
            return { success: false, error: 'Project already exists' };
        }
        
        const defaultCell = {
            id: 1,
            type: 'backend',
            language: 'javascript',
            filename: 'api.js',
            code: '// New project\nreturn { message: "Hello from ' + projectName + '" };',
            output: null,
            status: 'idle'
        };
        
        fs.writeFileSync(projectFile, JSON.stringify([defaultCell], null, 2));
        
        return { success: true, projectName };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function switchProject(projectName) {
    try {
        const projectFile = path.join(__dirname, `${projectName}.playground.json`);
        
        if (!fs.existsSync(projectFile)) {
            return { success: false, error: 'Project not found' };
        }
        
        CURRENT_PROJECT = projectName;
        
        return { success: true, projectName };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getCurrentProject() {
    return CURRENT_PROJECT;
}

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
    const saveFile = SAVE_FILE();
    ws.send(JSON.stringify({
        type: 'CURRENT_PROJECT',
        projectName: CURRENT_PROJECT,
        projects: listProjects()
    }));
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
        
        if (data.token !== SECRET_TOKEN) return;

        if (data.command === 'EXECUTE') {
            const { cellId, code, language } = data;
            const lang = language || 'javascript';

            if (lang === 'javascript') {
                try {
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
                    
                    const result = await vm.runInContext(`(async()=>{${code}})()`, sandbox);
                    ws.send(JSON.stringify({ type: 'result', cellId, content: result }));
                } catch (e) { 
                    ws.send(JSON.stringify({ type: 'error', cellId, content: e.message })); 
                }
            } else {
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

        if (data.command === 'SAVE') {
            try {
                const saveFile = SAVE_FILE();
                fs.writeFileSync(saveFile, JSON.stringify(data.cells, null, 2));
                ws.send(JSON.stringify({ type: 'log', content: `Project '${CURRENT_PROJECT}' saved to disk!` }));
            } catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    content: 'Failed to save: ' + e.message 
                }));
            }
        }

        if (data.command === 'LOAD') {
            const saveFile = SAVE_FILE();
            if (fs.existsSync(saveFile)) {
                try {
                ws.send(JSON.stringify({ 
                    type: 'LOAD_DATA', 
                    cells: JSON.parse(fs.readFileSync(SAVE_FILE)) 
                }));
            }
            catch (e) {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    content: 'Failed to load: ' + e.message 
                }));
            }
            }
        }

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

        if (data.command === 'ADD_ENV_VAR') {
            try {
                const { key, value } = data;
                
                if (!key || !value) {
                    ws.send(JSON.stringify({ 
                        type: 'ENV_ERROR', 
                        message: 'Key and value are required' 
                    }));
                    return;
                }
                
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
                    console.log(`Added environment variable: ${key}`);
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
                    console.log(`Deleted environment variable: ${key}`);
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
                
                if (fs.existsSync(ENV_FILE)) {
                    fs.copyFileSync(ENV_FILE, path.join(exportDir, '.env'));
                    console.log('Copied .env file to export');
                }
                
                console.log(`Exported ${count} files to ${exportDir}`);
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
        if (data.command === 'LIST_PROJECTS') {
            try {
                const projects = listProjects();
                ws.send(JSON.stringify({
                    type: 'PROJECTS_LIST',
                    projects: projects,
                    currentProject: CURRENT_PROJECT
                }));
            } catch (e) {
                ws.send(JSON.stringify({
                    type: 'PROJECT_ERROR',
                    message: 'Failed to list projects: ' + e.message
                }));
            }
        }

        if (data.command === 'CREATE_PROJECT') {
            try {
                const { projectName } = data;
                
                if (!projectName || projectName.trim() === '') {
                    ws.send(JSON.stringify({
                        type: 'PROJECT_ERROR',
                        message: 'Project name is required'
                    }));
                    return;
                }
                
                const result = createProject(projectName.trim());
                
                if (result.success) {
                    ws.send(JSON.stringify({
                        type: 'PROJECT_CREATED',
                        projectName: result.projectName,
                        projects: listProjects()
                    }));
                    console.log(`Created project: ${result.projectName}`);
                } else {
                    ws.send(JSON.stringify({
                        type: 'PROJECT_ERROR',
                        message: result.error
                    }));
                }
            } catch (e) {
                ws.send(JSON.stringify({
                    type: 'PROJECT_ERROR',
                    message: 'Failed to create project: ' + e.message
                }));
            }
        }

        if (data.command === 'SWITCH_PROJECT') {
            try {
                const { projectName } = data;
                
                if (!projectName) {
                    ws.send(JSON.stringify({
                        type: 'PROJECT_ERROR',
                        message: 'Project name is required'
                    }));
                    return;
                }
                
                const result = switchProject(projectName);
                
                if (result.success) {
                    const saveFile = SAVE_FILE();
                    let cells = [];
                    
                    if (fs.existsSync(saveFile)) {
                        cells = JSON.parse(fs.readFileSync(saveFile));
                    }
                    
                    ws.send(JSON.stringify({
                        type: 'PROJECT_SWITCHED',
                        projectName: result.projectName,
                        cells: cells,
                        projects: listProjects()
                    }));
                    console.log(`Switched to project: ${result.projectName}`);
                } else {
                    ws.send(JSON.stringify({
                        type: 'PROJECT_ERROR',
                        message: result.error
                    }));
                }
            } catch (e) {
                ws.send(JSON.stringify({
                    type: 'PROJECT_ERROR',
                    message: 'Failed to switch project: ' + e.message
                }));
            }
        }

        if (data.command === 'GET_CURRENT_PROJECT') {
            try {
                ws.send(JSON.stringify({
                    type: 'CURRENT_PROJECT',
                    projectName: getCurrentProject(),
                    projects: listProjects()
                }));
            } catch (e) {
                ws.send(JSON.stringify({
                    type: 'PROJECT_ERROR',
                    message: 'Failed to get current project: ' + e.message
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
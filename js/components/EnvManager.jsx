function EnvManager({ isOpen, onClose, socket, currentProject, availableProjects}) {
  const { useState, useEffect } = React;
  
  const [envVars, setEnvVars] = useState([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);

  useEffect(() => {
    if (isOpen && socket) {
      loadEnvVars();
    }
  }, [isOpen]);

  const loadEnvVars = () => {
    setLoading(true);
    setError(null);
    sendWebSocketCommand(socket, 'GET_ENV_VARS');
  };

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'ENV_VARS_LIST') {
        setEnvVars(data.vars || []);
        setLoading(false);
      } else if (data.type === 'ENV_VAR_ADDED') {
        setSuccess('Environment variable added successfully!');
        setNewKey('');
        setNewValue('');
        loadEnvVars();
        setTimeout(() => setSuccess(null), 3000);
      } else if (data.type === 'ENV_VAR_DELETED') {
        setSuccess('Environment variable deleted!');
        loadEnvVars();
        setTimeout(() => setSuccess(null), 3000);
      } else if (data.type === 'ENV_ERROR') {
        setError(data.message);
        setLoading(false);
      }
      else if (data.type === 'ENV_ERROR') {
        setError(data.message);
        setLoading(false);
      } else if (data.type === 'PROJECT_CREATED') {
        setSuccess('Project created successfully!');
        setLoading(false);
        setTimeout(() => setSuccess(null), 3000);
      } else if (data.type === 'PROJECT_SWITCHED') {
        setSuccess(`Switched to project '${data.projectName}'`);
        setLoading(false);
        setTimeout(() => setSuccess(null), 3000);
      } else if (data.type === 'PROJECT_ERROR') {
        setError(data.message);
        setLoading(false);
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  const handleAddVar = (e) => {
    e.preventDefault();
    
    if (!newKey.trim() || !newValue.trim()) {
      setError('Both key and value are required');
      return;
    }

    if (!/^[A-Z_][A-Z0-9_]*$/i.test(newKey)) {
      setError('Key must contain only letters, numbers, and underscores');
      return;
    }

    setError(null);
    setLoading(true);
    sendWebSocketCommand(socket, 'ADD_ENV_VAR', { key: newKey, value: newValue });
  };

  const handleDeleteVar = (key) => {
    if (confirm(`Are you sure you want to delete ${key}?`)) {
      setLoading(true);
      sendWebSocketCommand(socket, 'DELETE_ENV_VAR', { key });
    }
  };

  const handleCreateProject = (e) => {
    e.preventDefault();
    
    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(newProjectName)) {
      setError('Project name can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    setError(null);
    setLoading(true);
    sendWebSocketCommand(socket, 'CREATE_PROJECT', { projectName: newProjectName.trim() });
    setNewProjectName('');
    setShowNewProjectForm(false);
  };

  const handleSwitchProject = (projectName) => {
    if (projectName === currentProject) return;
    
    if (confirm(`Switch to project '${projectName}'? Make sure you've saved your current work.`)) {
      setLoading(true);
      sendWebSocketCommand(socket, 'SWITCH_PROJECT', { projectName });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl m-4 overflow-hidden border border-slate-100 animate-[fadeIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <i data-lucide="key" className="w-5 h-5 text-white"></i>
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-800">Environment Variables</h3>
              <p className="text-xs text-slate-500">Manage your secrets and API keys securely</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
            <i data-lucide="x" className="w-5 h-5 text-slate-600"></i>
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">

          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <i data-lucide="folder" className="w-4 h-4 text-indigo-600"></i>
                Project Manager
              </h4>
              <button
                onClick={() => setShowNewProjectForm(!showNewProjectForm)}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all"
              >
                <i data-lucide="plus" className="w-3 h-3"></i>
                New Project
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Current Project
              </label>
              <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-indigo-300 rounded-lg">
                <i data-lucide="folder-open" className="w-4 h-4 text-indigo-600"></i>
                <span className="font-mono font-bold text-sm text-indigo-700">{currentProject}</span>
              </div>
            </div>

            {showNewProjectForm && (
              <form onSubmit={handleCreateProject} className="mb-4 p-4 bg-white border border-indigo-200 rounded-lg">
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  New Project Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="my-experiment"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !newProjectName.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {availableProjects && availableProjects.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Switch Project
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableProjects.filter(p => p !== currentProject).map((project) => (
                    <button
                      key={project}
                      onClick={() => handleSwitchProject(project)}
                      className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition-all text-left group"
                    >
                      <i data-lucide="folder" className="w-4 h-4 text-slate-400 group-hover:text-indigo-600"></i>
                      <span className="font-mono text-sm text-slate-700 group-hover:text-indigo-700">{project}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 my-6"></div>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <i data-lucide="info" className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"></i>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How it works:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Variables are stored in <code className="bg-blue-100 px-1 rounded">.env</code> file on disk</li>
                <li>• Access them in Node.js cells via <code className="bg-blue-100 px-1 rounded">process.env.YOUR_KEY</code></li>
                <li>• Values are masked for security</li>
              </ul>
            </div>
          </div>

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
              <i data-lucide="check-circle" className="w-5 h-5"></i>
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <i data-lucide="alert-circle" className="w-5 h-5"></i>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleAddVar} className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i data-lucide="plus-circle" className="w-4 h-4 text-indigo-600"></i>
              Add New Variable
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Key</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  placeholder="API_KEY"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Value</label>
                <input
                  type="password"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="your-secret-value"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono text-sm"
                  disabled={loading}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !newKey.trim() || !newValue.trim()}
              className="mt-4 flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <i data-lucide={loading ? "loader-2" : "plus"} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}></i>
              {loading ? 'Adding...' : 'Add Variable'}
            </button>
          </form>

          <div>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i data-lucide="list" className="w-4 h-4 text-purple-600"></i>
              Existing Variables ({envVars.length})
            </h4>

            {loading && envVars.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <i data-lucide="loader-2" className="w-8 h-8 mx-auto mb-2 animate-spin"></i>
                <p className="text-sm">Loading variables...</p>
              </div>
            ) : envVars.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <i data-lucide="inbox" className="w-12 h-12 mx-auto mb-3 opacity-30"></i>
                <p className="text-sm font-medium">No environment variables yet</p>
                <p className="text-xs mt-1">Add your first one above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {envVars.map((envVar) => (
                  <div key={envVar.key} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors group">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="bg-slate-100 p-2 rounded">
                        <i data-lucide="key" className="w-4 h-4 text-slate-600"></i>
                      </div>
                      <div className="flex-1">
                        <div className="font-mono font-bold text-sm text-slate-800">{envVar.key}</div>
                        <div className="font-mono text-xs text-slate-400 mt-1">
                          {envVar.masked || '••••••••••••••'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVar(envVar.key)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete variable"
                    >
                      <i data-lucide="trash-2" className="w-4 h-4"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <i data-lucide="shield-check" className="w-4 h-4 text-green-600"></i>
            Stored in <code className="bg-slate-200 px-2 py-0.5 rounded">.env</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
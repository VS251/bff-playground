
function App() {
  const { useState, useEffect, useRef } = React;
  
  const [status, setStatus] = useState("disconnected");
  const [socket, setSocket] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [cells, setCells] = useState([
    { 
      id: 1, 
      type: 'backend', 
      language: 'javascript', 
      filename: 'api.js', 
      code: EXAMPLES.javascript, 
      output: null, 
      status: 'idle' 
    }
  ]);
  
  const cellsRef = useRef(cells);
  useEffect(() => { cellsRef.current = cells; }, [cells]);

  useEffect(() => {
    const ws = createWebSocketConnection(
      (socket) => {
        setStatus("connected");
        setSocket(socket);
      },
      () => setStatus("disconnected"),
      (data) => {
        if (data.type === 'LOAD_DATA') {
          setCells(data.cells.map(c => ({...c, loadKey: Date.now()})));
          setTimeout(() => {
            data.cells.forEach(c => { 
              if(c.type === 'frontend') executeCell(c.id); 
            });
          }, 500);
        } else if (data.type === 'result') {
          handleBackendResult(data.cellId, data.content);
        } else if (data.type === 'error') {
          handleBackendError(data.cellId, data.content);
        }
      }
    );

    return () => ws.close();
  }, []);

  useEffect(() => { 
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 50);
    }
  }, [cells, showHelp, showEnvManager]);

  const executeCell = (id) => {
    const cell = cellsRef.current.find(c => c.id === id);
    if(!cell) return;
    
    setCells(prev => prev.map(c => c.id === id ? { ...c, status: 'running', error: null } : c));
    
    if (cell.type === 'frontend') {
      setTimeout(() => {
        try {
          const wrappedCode = `(function(React, window) { ${cell.code} })`;
          const transpiled = Babel.transform(wrappedCode, { presets: ['react'] }).code;
          const renderFunction = eval(transpiled);
          const resultComponent = renderFunction(React, window);
          setCells(prev => prev.map(c => c.id === id ? { ...c, output: resultComponent, status: 'success' } : c));
        } catch (err) {
          setCells(prev => prev.map(c => c.id === id ? { ...c, error: err.message, status: 'error' } : c));
        }
      }, 10);
    }
  };

  const runCell = (id) => {
    const cell = cellsRef.current.find(c => c.id === id);
    if (cell.type === 'backend') {
      setCells(prev => prev.map(c => c.id === id ? { ...c, status: 'running', error: null } : c));
      sendWebSocketCommand(socket, 'EXECUTE', { 
        cellId: id, 
        code: cell.code, 
        language: cell.language || 'javascript' 
      });
    } else {
      executeCell(id);
    }
  };

  const handleBackendResult = (cellId, content) => {
    window.backendData[`cell_${cellId}`] = content;
    setCells(prev => prev.map(c => c.id === cellId ? { 
      ...c, 
      output: JSON.stringify(content, null, 2), 
      status: 'success', 
      error: null 
    } : c));
    
    const allCells = cellsRef.current;
    const dependents = allCells.filter(c => 
      c.id !== cellId && 
      (c.code.includes(`['cell_${cellId}']`) || c.code.includes(`["cell_${cellId}"]`))
    );
    dependents.forEach(dep => runCell(dep.id));
  };

  const handleBackendError = (cellId, errorMsg) => {
    setCells(prev => prev.map(c => c.id === cellId ? { 
      ...c, 
      error: errorMsg, 
      status: 'error' 
    } : c));
  };

  const saveProject = () => {
    sendWebSocketCommand(socket, 'SAVE', { 
      cells: cellsRef.current.map(({output, error, status, loadKey, ...rest}) => ({
        ...rest, 
        output: null, 
        status: 'idle'
      })) 
    });
  };

  const exportProject = () => {
    sendWebSocketCommand(socket, 'EXPORT', { cells: cellsRef.current });
  };

  const clearOutput = (id) => {
    setCells(prev => prev.map(c => c.id === id ? { 
      ...c, 
      output: null, 
      error: null, 
      status: 'idle' 
    } : c));
  };

  const deleteCell = (id) => {
    if(confirm("Are you sure you want to delete this cell?")) {
      setCells(prev => prev.filter(c => c.id !== id));
    }
  };

  const addCell = (type) => {
    const newId = cells.length > 0 ? Math.max(...cells.map(c => c.id)) + 1 : 1;
    setCells([...cells, { 
      id: newId, 
      type, 
      language: 'javascript', 
      filename: type === 'backend' ? `script_${newId}.js` : `Ui_${newId}.jsx`, 
      code: EXAMPLES.javascript, 
      output: null, 
      status: 'idle' 
    }]);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Header 
        status={status} 
        onHelp={() => setShowHelp(true)} 
        onEnvManager={() => setShowEnvManager(true)}
        onExport={exportProject} 
        onSave={saveProject} 
      />

      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto w-full space-y-8 pb-32">
        {cells.map(cell => (
          <Cell 
            key={cell.id + (cell.loadKey || '')} 
            cell={cell} 
            onLangChange={(lang) => setCells(prev => prev.map(c => c.id === cell.id ? { 
              ...c, 
              language: lang, 
              filename: `script_${c.id}.${lang === 'python' ? 'py' : lang === 'go' ? 'go' : lang === 'rust' ? 'rs' : lang === 'java' ? 'java' : 'js'}`, 
              code: EXAMPLES[lang] || '' 
            } : c))}
            onFilenameChange={(val) => setCells(prev => prev.map(c => c.id === cell.id ? { ...c, filename: val } : c))}
            onChange={(val) => setCells(prev => prev.map(c => c.id === cell.id ? { ...c, code: val } : c))} 
            onRun={() => runCell(cell.id)}
            onClear={() => clearOutput(cell.id)}
            onDelete={() => deleteCell(cell.id)} 
          />
        ))}

        <div className="flex justify-center gap-6 py-8 opacity-80 hover:opacity-100 transition-opacity">
          <button 
            onClick={() => addCell('backend')} 
            className="group flex items-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 text-slate-600 text-sm font-bold border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <span className="bg-purple-100 p-1.5 rounded text-purple-600 group-hover:bg-purple-200 transition-colors">
              <i data-lucide="server" className="w-4 h-4"></i>
            </span> Add Backend
          </button>
          <button 
            onClick={() => addCell('frontend')} 
            className="group flex items-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 text-slate-600 text-sm font-bold border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <span className="bg-pink-100 p-1.5 rounded text-pink-600 group-hover:bg-pink-200 transition-colors">
              <i data-lucide="layout" className="w-4 h-4"></i>
            </span> Add Frontend
          </button>
        </div>
      </main>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      <EnvManager isOpen={showEnvManager} onClose={() => setShowEnvManager(false)} socket={socket} />
    </div>
  );
}
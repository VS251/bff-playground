function Header({ status, currentProject, onHelp, onExport, onSave, onEnvManager }) {
  return (
    <header className="h-16 glass-header border-b border-slate-200/70 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-lg shadow-indigo-200">
          <i data-lucide="zap" className="w-5 h-5 fill-current"></i>
        </div>
        <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
          BFF <span className="font-light text-slate-500">Playground</span>
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={onEnvManager} 
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm hover:shadow"
          title="Environment Variables"
        >
          <i data-lucide="key" className="w-4 h-4 text-purple-600"></i>
          <span>Secrets</span>
        </button>
        <button 
          onClick={onHelp} 
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm hover:shadow"
          title="Documentation"
        >
          <i data-lucide="help-circle" className="w-4 h-4 text-indigo-500"></i>
          <span>Help</span>
        </button>
        <div className="h-6 w-px bg-slate-300"></div>
        <button 
          onClick={onExport} 
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm hover:shadow"
        >
          <i data-lucide="download" className="w-4 h-4 text-indigo-500"></i> Export
        </button>
        <button 
          onClick={onSave} 
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300"
        >
          <i data-lucide="save" className="w-4 h-4"></i> Save
        </button>
        <span className={`block w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
      </div>
    </header>
  );
}
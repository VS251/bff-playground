function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 overflow-hidden border border-slate-100 animate-[fadeIn_0.2s_ease-out]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <h3 className="font-bold text-xl text-slate-800">Documentation</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <i data-lucide="x" className="w-5 h-5"></i>
          </button>
        </div>
        <div className="p-8 max-h-[70vh] overflow-y-auto text-slate-600">
          <p className="mb-6 text-lg">Welcome to the <strong>Literate Full-Stack Playground</strong>.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <i data-lucide="terminal" className="w-4 h-4 text-purple-600"></i> Backend
              </h4>
              <ul className="space-y-2 text-sm">
                <li><strong className="text-slate-800">Node.js:</strong> Local execution. Full access to your file system.</li>
                <li><strong className="text-slate-800">!Shell:</strong> Start line with <code>!</code> to run terminal commands.</li>
                <li><strong className="text-slate-800">Cloud:</strong> Python, Go, Rust run remotely.</li>
              </ul>
            </div>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <i data-lucide="layout" className="w-4 h-4 text-pink-600"></i> Frontend
              </h4>
              <ul className="space-y-2 text-sm">
                <li><strong className="text-slate-800">React:</strong> JSX compiled in-browser.</li>
                <li><strong className="text-slate-800">Binding:</strong> Use <code>window.backendData['cell_ID']</code> to access data.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
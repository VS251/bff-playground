function JsonTreeView({ data, name = 'root' }) {
  const { useState } = React;

  const JsonNode = ({ value, keyName, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(depth < 2);
    const [copied, setCopied] = useState(false);

    const handleCopy = (val) => {
      const textToCopy = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    const indent = depth * 20;

    if (value === null) {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="flex items-center gap-2 py-0.5 group/item">
          {keyName && <span className="text-slate-600 font-medium">{keyName}:</span>}
          <span className="text-purple-600 font-semibold">null</span>
          <button
            onClick={() => handleCopy(value)}
            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
            title="Copy value"
          >
            <i data-lucide={copied ? "check" : "copy"} className={`w-3 h-3 ${copied ? 'text-green-600' : 'text-slate-400'}`}></i>
          </button>
        </div>
      );
    }

    if (value === undefined) {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="flex items-center gap-2 py-0.5 group/item">
          {keyName && <span className="text-slate-600 font-medium">{keyName}:</span>}
          <span className="text-slate-400 font-semibold italic">undefined</span>
          <button
            onClick={() => handleCopy('undefined')}
            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
            title="Copy value"
          >
            <i data-lucide={copied ? "check" : "copy"} className={`w-3 h-3 ${copied ? 'text-green-600' : 'text-slate-400'}`}></i>
          </button>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="flex items-center gap-2 py-0.5 group/item">
          {keyName && <span className="text-slate-600 font-medium">{keyName}:</span>}
          <span className="text-orange-600 font-semibold">{String(value)}</span>
          <button
            onClick={() => handleCopy(value)}
            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
            title="Copy value"
          >
            <i data-lucide={copied ? "check" : "copy"} className={`w-3 h-3 ${copied ? 'text-green-600' : 'text-slate-400'}`}></i>
          </button>
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="flex items-center gap-2 py-0.5 group/item">
          {keyName && <span className="text-slate-600 font-medium">{keyName}:</span>}
          <span className="text-blue-600 font-semibold">{value}</span>
          <button
            onClick={() => handleCopy(value)}
            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
            title="Copy value"
          >
            <i data-lucide={copied ? "check" : "copy"} className={`w-3 h-3 ${copied ? 'text-green-600' : 'text-slate-400'}`}></i>
          </button>
        </div>
      );
    }

    if (typeof value === 'string') {
      return (
        <div style={{ marginLeft: `${indent}px` }} className="flex items-center gap-2 py-0.5 group/item">
          {keyName && <span className="text-slate-600 font-medium">{keyName}:</span>}
          <span className="text-green-700 font-medium">"{value}"</span>
          <button
            onClick={() => handleCopy(value)}
            className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
            title="Copy value"
          >
            <i data-lucide={copied ? "check" : "copy"} className={`w-3 h-3 ${copied ? 'text-green-600' : 'text-slate-400'}`}></i>
          </button>
        </div>
      );
    }

    if (Array.isArray(value)) {
      const isEmpty = value.length === 0;
      return (
        <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
          <div className="flex items-center gap-2 group/item">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 hover:bg-slate-100 rounded transition-all flex items-center gap-1"
              disabled={isEmpty}
            >
              {!isEmpty && (
                <i data-lucide={isExpanded ? "chevron-down" : "chevron-right"} className="w-3.5 h-3.5 text-slate-400"></i>
              )}
              {keyName && <span className="text-slate-600 font-medium">{keyName}:</span>}
              <span className="text-slate-500 font-mono text-sm">
                [{isEmpty ? '' : value.length}]
              </span>
            </button>
            <button
              onClick={() => handleCopy(value)}
              className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
              title="Copy array"
            >
              <i data-lucide={copied ? "check" : "copy"} className={`w-3 h-3 ${copied ? 'text-green-600' : 'text-slate-400'}`}></i>
            </button>
          </div>
          {isExpanded && !isEmpty && (
            <div className="border-l-2 border-slate-200 ml-2 mt-1">
              {value.map((item, index) => (
                <JsonNode key={index} value={item} keyName={index} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      const isEmpty = keys.length === 0;
      return (
        <div style={{ marginLeft: `${indent}px` }} className="py-0.5">
          <div className="flex items-center gap-2 group/item">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-0.5 hover:bg-slate-100 rounded transition-all flex items-center gap-1"
              disabled={isEmpty}
            >
              {!isEmpty && (
                <i data-lucide={isExpanded ? "chevron-down" : "chevron-right"} className="w-3.5 h-3.5 text-slate-400"></i>
              )}
              {keyName && <span className="text-slate-600 font-medium">{keyName}:</span>}
              <span className="text-slate-500 font-mono text-sm">
                {'{'}{ isEmpty ? '' : keys.length}{'}'}
              </span>
            </button>
            <button
              onClick={() => handleCopy(value)}
              className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
              title="Copy object"
            >
              <i data-lucide={copied ? "check" : "copy"} className={`w-3 h-3 ${copied ? 'text-green-600' : 'text-slate-400'}`}></i>
            </button>
          </div>
          {isExpanded && !isEmpty && (
            <div className="border-l-2 border-slate-200 ml-2 mt-1">
              {keys.map((key) => (
                <JsonNode key={key} value={value[key]} keyName={key} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ marginLeft: `${indent}px` }} className="flex items-center gap-2 py-0.5 group/item">
        {keyName && <span className="text-slate-600 font-medium">{keyName}:</span>}
        <span className="text-slate-700">{String(value)}</span>
        <button
          onClick={() => handleCopy(value)}
          className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-slate-100 rounded transition-all"
          title="Copy value"
        >
          <i data-lucide={copied ? "check" : "copy"} className={`w-3 h-3 ${copied ? 'text-green-600' : 'text-slate-400'}`}></i>
        </button>
      </div>
    );
  };

  return (
    <div className="p-6 font-mono text-xs text-slate-700 leading-relaxed bg-white">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-2">
        Console Output
      </div>
      <JsonNode value={data} keyName={name} depth={0} />
    </div>
  );
}


function Cell({ cell, onChange, onLangChange, onFilenameChange, onRun, onClear, onDelete }) {
  const isBackend = cell.type === 'backend';
  const isRunning = cell.status === 'running';
  const isCloud = isBackend && cell.language !== 'javascript';
  const borderColor = isRunning ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-20' : 'border-slate-200';

  return (
    <div className={`relative rounded-2xl overflow-hidden border ${borderColor} bg-white shadow-sm transition-all duration-300 hover:shadow-lg group`}>
      <button
        onClick={onDelete}
        className="absolute top-4 right-1 z-10 p-2 bg-white text-red-600 hover:bg-red-50 rounded-full shadow-sm border border-red-100 transition-colors"
        title="Delete Cell"
        aria-label={`Delete cell ${cell.id}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>

      <div className="px-5 py-3 pr-12 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide border ${isBackend ? 'bg-slate-200/50 text-slate-600 border-slate-300/50' : 'bg-indigo-100/50 text-indigo-600 border-indigo-200/50'}`}>
              {isBackend ? 'BACKEND' : 'FRONTEND'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold mt-1 ml-1">CELL #{cell.id}</span>
          </div>

          <div className="flex items-center gap-2 group/file">
            <i data-lucide="file" className="w-3.5 h-3.5 text-slate-400 group-hover/file:text-indigo-500 transition-colors"></i>
            <input
              type="text"
              value={cell.filename || ''}
              onChange={(e) => onFilenameChange(e.target.value)}
              className="bg-transparent text-xs text-slate-600 font-medium w-40 outline-none focus:text-indigo-600 placeholder:text-slate-300"
              placeholder="filename.ext"
            />
          </div>

          {isBackend && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
              <select
                value={cell.language || 'javascript'}
                onChange={(e) => onLangChange(e.target.value)}
                className="bg-transparent text-xs text-slate-600 font-bold uppercase tracking-wide outline-none hover:text-indigo-600 cursor-pointer"
              >
                <option value="javascript">Node.js</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="java">Java</option>
                <option value="csharp">C#</option>
              </select>
              {isCloud && (
                <span className="text-[9px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100 flex items-center gap-1 font-bold">
                  <i data-lucide="cloud" className="w-2.5 h-2.5"></i> CLOUD
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group/clear"
            title="Clear Output"
            aria-label={`Clear output for cell ${cell.id}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform group-hover/clear:rotate-12">
              <path d="M20.84 10.34l-7.17-7.17a2.25 2.25 0 0 0-3.18 0L2.93 10.1a2.25 2.25 0 0 0 0 3.18l7.17 7.17a2.25 2.25 0 0 0 3.18 0l6.65-6.65a2.25 2.25 0 0 0 0-3.16z"></path>
              <path d="M7 13l4-4"></path>
            </svg>
          </button>

          <button
            onClick={onRun}
            disabled={isRunning}
            className={`relative z-30 ml-2 flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isRunning ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg shadow-indigo-200'}`}
          >
            <i data-lucide={isRunning ? "loader-2" : "play"} className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-current'}`}></i>
            {isRunning ? 'RUNNING' : 'RUN'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-[400px] md:h-[320px]">
        <div className="flex-1 relative h-full border-r border-slate-100">
          <Editor code={cell.code} onChange={onChange} language={cell.language || 'javascript'} />
        </div>
        <div className="flex-1 border-t md:border-t-0 bg-white relative h-full overflow-auto">
          {cell.error && (
            <div className="p-6 bg-red-50 text-red-600 text-sm font-mono whitespace-pre-wrap border-b border-red-100 h-full">
              <div className="flex items-center gap-2 mb-3 font-bold">
                <i data-lucide="alert-triangle" className="w-5 h-5"></i> Execution Error
              </div>
              {cell.error}
            </div>
          )}

          {!cell.error && cell.output && (
            <div className="h-full w-full">
              {isBackend ? (
                <JsonTreeView data={cell.output} name="output" />
              ) : (
              <div className="preview-box p-6 h-full flex items-center justify-center text-slate-800">{cell.output}</div>
              )}
            </div>
          )}

          {!cell.error && !cell.output && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200">
              <i data-lucide="terminal" className="w-12 h-12 mb-3 opacity-40"></i>
              <span className="text-xs font-bold uppercase tracking-widest opacity-60">Ready to Run</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
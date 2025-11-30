function Editor({ code, onChange, language }) {
  const { useRef, useEffect } = React;
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  
  const getMonacoLang = (l) => {
    if (l === 'csharp') return 'csharp';
    if (l === 'java') return 'java';
    if (l === 'typescript') return 'typescript';
    if (l === 'go') return 'go';
    if (l === 'rust') return 'rust';
    if (l === 'php') return 'php';
    if (l === 'python') return 'python';
    return 'javascript';
  };
  
  useEffect(() => {
    if (containerRef.current) {
      require(['vs/editor/editor.main'], function () {
        if (!containerRef.current) return;
        editorRef.current = monaco.editor.create(containerRef.current, {
          value: code, 
          language: getMonacoLang(language), 
          theme: 'vs', 
          automaticLayout: true, 
          minimap: { enabled: false }, 
          fontSize: 13, 
          fontFamily: "'Fira Code', Consolas, monospace", 
          padding: { top: 16 }, 
          renderLineHighlight: 'none', 
          scrollBeyondLastLine: false
        });
        editorRef.current.onDidChangeModelContent(() => {
          onChange(editorRef.current.getValue());
        });
      });
    }
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);
  
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      monaco.editor.setModelLanguage(model, getMonacoLang(language));
      if (editorRef.current.getValue() !== code) {
        editorRef.current.setValue(code);
      }
    }
  }, [language]);
  
  return <div ref={containerRef} className="w-full h-full min-h-[200px]" />;
}
import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AiChatFooter } from '../components/AiChatFooter';
import Header from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { PropertyPanel } from '../components/PropertyPanel';
import { Toolbar } from '../components/Toolbar';
import { useCanvas } from '../hooks/useCanvas';

// 初始数据
const INITIAL_OBJECTS = [
  { id: 'obj-1', name: 'Object_1', type: 'rect', x: 250, y: 150, width: 128, height: 128, fillColor: '#3862f6', borderRadius: 8, behaviors: [] },
  { id: 'obj-2', name: 'Title_Text', type: 'text', x: 250, y: 80, text: 'Hello IdeaWeave', fontSize: 24, fillColor: '#1e293b', behaviors: [] }
];

export default function App() {
  const [objects, setObjects] = useState(INITIAL_OBJECTS);
  const [selectedId, setSelectedId] = useState(INITIAL_OBJECTS[0].id);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('edit');
  const [activeTool, setActiveTool] = useState('select');

  const handleAddCustomObject = () => {
    const newId = `obj-${Date.now()}`;
    const newObj = {
      id: newId,
      name: `Custom_${objects.length + 1}`,
      type: 'rect',
      x: 350, y: 250,
      width: 100, height: 100,
      fillColor: '#8b5cf6',
      borderRadius: 8,
      behaviors: []
    };
    setObjects([...objects, newObj]);
    setActiveTool('select'); // 创建完自动切回选择模式
    handleSelect(newId);
  };

  const selectedObj = objects.find(o => o.id === selectedId);
  const deleteObject = (id) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    setSelectedId(null); // 删除后取消选中
  };

  const handleSelect = (id) => {
    if (mode !== 'edit') return;
    setSelectedId(id);
    if (canvasManager) {
      canvasManager.setActiveObjectById(id);
    }
  };

  const updateObject = useCallback((id, updates) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, []);

  const canvasManager = useCanvas(
    objects,
    setObjects,
    mode,
    setSelectedId,
  );

  useEffect(() => {
    if (canvasManager) {
      canvasManager.setTool(activeTool);
    }
  }, [activeTool, canvasManager]);




  const handleAICommand = (cmd) => {
    if (!cmd.trim()) return;
    const ts = Date.now();
    const newId = `obj-${objects.length + 1}`;
    let newObj = null;

    if (cmd.includes('正方形') || cmd.includes('旋转')) {
      newObj = { id: newId, name: `Object_${objects.length + 1}`, type: 'rect', x: 200 + Math.random() * 400, y: 150 + Math.random() * 200, width: 120, height: 120, fillColor: '#3862f6', borderRadius: 8, behaviors: [{ id: `bh-${ts}`, name: '点击旋转', desc: 'mousedown → 旋转360°' }] };
    } else if (cmd.includes('圆') || cmd.includes('变大')) {
      newObj = { id: newId, name: `Object_${objects.length + 1}`, type: 'circle', x: 200 + Math.random() * 400, y: 150 + Math.random() * 200, width: 100, height: 100, fillColor: '#f43f5e', borderRadius: 50, behaviors: [{ id: `bh-${ts}`, name: '点击变大', desc: 'mousedown → 比例变大' }] };
    } else if (cmd.includes('移动')) {
      newObj = { id: newId, name: `Object_${objects.length + 1}`, type: 'rect', x: 200 + Math.random() * 400, y: 150 + Math.random() * 200, width: 100, height: 100, fillColor: '#10b981', borderRadius: 8, behaviors: [{ id: `bh-${ts}`, name: '点击随机移动', desc: 'mousedown → 随机移动' }] };
    }

    if (newObj) {
      setObjects([...objects, newObj]);
      setSelectedId(newId);
      setInput('');
      if (mode === 'edit') handleSelect(newId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#fcfcfc', color: '#1e293b', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <Header
        mode={mode}
        setMode={setMode}
        setActiveTool={setActiveTool}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ObjectList
          objects={objects}
          selectedId={selectedId}
          handleSelect={handleSelect}
          mode={mode}
        />

        <main style={{ flex: 1, backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div style={{ position: 'relative', width: 800, height: 600, backgroundColor: 'white', boxShadow: '0 0 24px rgba(0,0,0,0.05)', border: mode === 'play' ? '2px solid #3b82f6' : '1px solid #f1f5f9', transition: 'border 0.3s' }}>

            {/* 工具栏组件 */}
            <Toolbar
              activeTool={activeTool}
              setActiveTool={setActiveTool}
              onAddObject={handleAddCustomObject}
              mode={mode}
            />


            <div style={{ width: '100%', height: '100%' }}>
              <canvas id="fabric-canvas" />

            </div>

            <div style={{ position: 'absolute', top: -24, left: 0, fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: mode === 'play' ? '#3b82f6' : '#94a3b8' }}></div>
              {mode === 'play' ? 'INTERACTIVE PREVIEW' : 'DESIGN MODE'}
            </div>

            {mode === 'edit' && (
              <button onClick={() => { setObjects(INITIAL_OBJECTS); setSelectedId(INITIAL_OBJECTS[0].id); }}
                style={{ position: 'absolute', top: 10, left: 10, padding: '6px 12px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <Trash2 size={14} />清空画布
              </button>
            )}
          </div>
        </main>

        <PropertyPanel
          selectedObj={selectedObj}
          selectedId={selectedId}
          updateObject={updateObject}
          onDelete={deleteObject}
          mode={mode}
        />
      </div>
      <AiChatFooter
        input={input}
        setInput={setInput}
        handleAICommand={handleAICommand}
      />
    </div>
  );
}
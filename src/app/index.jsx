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

// 模拟一个发送给 AI 的函数
const askAI = async (userInput, currentObjects) => {
  const API_KEY = "sk-4ddc42fea38a4368b93263d55f0b59cd"; // 记得换成你申请的 key
  const BASE_URL = "https://api.deepseek.com/v1/chat/completions";

  // 这是给 AI 的“说明书”，告诉它必须按我们的格式回话
  const systemPrompt = `你是一个绘图助手。请根据用户指令返回 JSON。
  当前物体列表：${JSON.stringify(currentObjects.map(o => ({id: o.id, name: o.name})))}
  
  如果是创建，返回：{"type":"CREATE", "shape":"rect", "color":"#3862f6"}
  如果是让某个物体动，返回：{"type":"ANIMATE", "id":"物体的id", "action":"旋转"}`;

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      response_format: { type: "json_object" } // 强行要求返回JSON
    })
  });

  const resData = await response.json();
  return JSON.parse(resData.choices[0].message.content);
};

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




  const handleAICommand = async (cmd) => {
    if (!cmd.trim()) return;

    console.log("正在思考指令:", cmd);

    try {
      // 1. 调用刚才写的翻译官函数
      const result = await askAI(cmd, objects);
      console.log("AI 返回了结果:", result);

      // 2. 根据 AI 的要求更新画布数据
      if (result.type === 'CREATE') {
        const newId = `obj-${Date.now()}`;
        const newObj = {
          id: newId,
          name: `AI_Object_${objects.length + 1}`,
          type: result.shape || 'rect',
          x: 300 + Math.random() * 100, // 随机放个位置
          y: 200 + Math.random() * 100,
          width: 120,
          height: 120,
          fillColor: result.color || '#3862f6',
          borderRadius: 8,
          behaviors: [] // 初始没动作
        };
        setObjects([...objects, newObj]); // 把新物体塞进数组
        setSelectedId(newId);
      } 
      else if (result.type === 'ANIMATE') {
        // 让某个物体动起来，就是给它的 behaviors 数组加东西
        const ts = Date.now();
        updateObject(result.id, {
          behaviors: [{ id: `bh-${ts}`, name: `点击${result.action}` }]
        });
      }

      setInput(''); // 清空输入框
    } catch (error) {
      console.error("AI 好像开小差了:", error);
      alert("AI 响应失败，请检查网络或 API Key");
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


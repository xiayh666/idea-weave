import { Eraser, Hand, MousePointer2, Pencil, Plus } from 'lucide-react';

export const Toolbar = ({ activeTool, setActiveTool, onAddObject, mode }) => {
  // 如果处于交互预览模式，隐藏工具栏
  if (mode === 'play') return null;

  const tools = [
    { id: 'select', icon: MousePointer2, label: '选择 / 移动' },
    { id: 'pan', icon: Hand, label: '拖拽画布' },
    { id: 'draw', icon: Pencil, label: '画笔' },
    { id: 'erase', icon: Eraser, label: '橡皮擦' },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: 24,
      left: 24,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      backgroundColor: 'white',
      padding: 8,
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      border: '1px solid #f1f5f9'
    }}>
      {tools.map(t => (
        <button 
          key={t.id} 
          onClick={() => setActiveTool(t.id)} 
          title={t.label} 
          style={{ 
            width: 40, height: 40, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            borderRadius: 8, border: 'none', 
            backgroundColor: activeTool === t.id ? '#eff6ff' : 'transparent', 
            color: activeTool === t.id ? '#3b82f6' : '#64748b', 
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <t.icon size={20} />
        </button>
      ))}
      
      <div style={{ height: 1, backgroundColor: '#e2e8f0', margin: '4px 0' }} />
      
      <button 
        onClick={onAddObject} 
        title="创建自定义对象" 
        style={{ 
          width: 40, height: 40, 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          borderRadius: 8, border: 'none', backgroundColor: 'transparent', color: '#10b981', cursor: 'pointer' 
        }}
      >
        <Plus size={20} />
      </button>
    </div>
  );
};
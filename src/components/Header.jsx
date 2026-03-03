import { MousePointer2, Play, RefreshCw } from "lucide-react"


export default function Header({ mode, setMode ,setActiveTool}) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '24px', height: '24px', backgroundColor: '#2563eb', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>W</div>
        <h1 style={{ fontWeight: '600', fontSize: '18px', margin: 0 }}>IdeaWeave 智绘板</h1>

        <div style={{ marginLeft: '32px', display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
          <button
            onClick={() => setMode('edit')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', transition: '0.2s', backgroundColor: mode === 'edit' ? 'white' : 'transparent', color: mode === 'edit' ? '#2563eb' : '#64748b', boxShadow: mode === 'edit' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
          >
            <MousePointer2 size={14} /> 编辑模式
          </button>
          <button
            onClick={() => {
              setMode('play')
              setActiveTool('select')
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', transition: '0.2s', backgroundColor: mode === 'play' ? 'white' : 'transparent', color: mode === 'play' ? '#2563eb' : '#64748b', boxShadow: mode === 'play' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
          >
            <Play size={14} /> 交互模式
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button style={{ padding: '8px', background: 'transparent', border: 'none' }}><RefreshCw size={18} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', backgroundColor: '#ecfdf5', color: '#065f46' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>AndesGPT-Connected
        </div>
        <button style={{ backgroundColor: '#2563eb', color: 'white', padding: '6px 16px', borderRadius: '6px', fontSize: '14px', border: 'none' }}>发布项目</button>
      </div>
    </header>
  )
}


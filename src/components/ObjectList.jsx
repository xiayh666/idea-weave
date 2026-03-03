import { Type } from "lucide-react";


export const ObjectList = ({ objects, selectedId, handleSelect, mode }) => (
  <aside style={{ width: '240px', borderRight: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '16px', flex: 1, overflow: 'auto' }}>
      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>Objects / 对象</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {objects.map(obj => (
          <div
            key={obj.id}
            onClick={() => handleSelect(obj.id)}
            style={{
              display: 'flex', alignItems: 'center', padding: '8px', borderRadius: '6px', 
              cursor: mode === 'edit' ? 'pointer' : 'default',
              opacity: mode === 'edit' ? 1 : 0.6,
              ...(selectedId === obj.id && mode === 'edit' ? { backgroundColor: '#eff6ff', color: '#1d4ed8' } : { color: '#475569' })
            }}
          >
            {obj.type === 'rect' ? <div style={{ width: 12, height: 12, border: '1px solid #93c5fd', borderRadius: 2, backgroundColor: obj.fillColor }} /> :
              obj.type === 'circle' ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid #93c5fd', backgroundColor: obj.fillColor }} /> :
                <Type size={14} />}
            <span style={{ marginLeft: 8, fontSize: 14 }}>{obj.name}</span>
          </div>
        ))}
      </div>
    </div>
  </aside>
);
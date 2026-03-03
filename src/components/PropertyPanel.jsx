import { Layout, Palette, Play, Trash2, Zap } from "lucide-react";

export const PropertyPanel = ({ selectedObj, selectedId, updateObject, mode, onDelete }) => {
  if (!selectedObj || mode !== 'edit') {
    return (
      <aside style={{ width: 288, borderLeft: '1px solid #e2e8f0', backgroundColor: 'white', overflowY: 'auto' }}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ marginBottom: 16 }}>{mode === 'play' ? <Play size={40} color="#3b82f6" /> : <Layout size={40} />}</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>{mode === 'play' ? '交互预览已开启' : '未选择任何对象'}</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>{mode === 'play' ? '点击画布中的物体触发你定义的交互逻辑' : '请在画布或左侧列表中选择对象进行编辑'}</p>
        </div>
      </aside>
    );
  }

  return (
    <aside style={{ width: 288, borderLeft: '1px solid #e2e8f0', backgroundColor: 'white', overflowY: 'auto' }}>
      <div style={{ padding: 16 }}>
        <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 24 }}>外观属性</h3>

        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Layout size={10} /> 布局 / Layout
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 10, color: '#64748b' }}>宽度 W</label>
              <input type="number" value={Math.round(selectedObj.width) || 0} onChange={(e) => updateObject(selectedId, { width: +e.target.value })}
                style={{ width: '100%', padding: 6, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#64748b' }}>高度 H</label>
              <input type="number" value={Math.round(selectedObj.height) || 0} onChange={(e) => updateObject(selectedId, { height: +e.target.value })}
                style={{ width: '100%', padding: 6, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none' }} />
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Palette size={10} /> 样式 / Style
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* 颜色选择器 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 14 }}>填充颜色</label>
              <input type="color" value={selectedObj.fillColor} onChange={(e) => updateObject(selectedId, { fillColor: e.target.value })}
                style={{ width: 24, height: 24, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
            </div>

            {/* 圆角半径调节 (仅对矩形显示) */}
            {selectedObj.type === 'rect' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 14 }}>圆角半径</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min="0"
                    max={Math.min(selectedObj.width, selectedObj.height) / 2} // 圆角最大不超过短边的一半
                    value={selectedObj.borderRadius || 0}
                    onChange={(e) => updateObject(selectedId, { borderRadius: +e.target.value })}
                    style={{ width: 60, cursor: 'pointer' }}
                  />
                  <input
                    type="number"
                    min="0"
                    value={Math.round(selectedObj.borderRadius) || 0}
                    onChange={(e) => updateObject(selectedId, { borderRadius: +e.target.value })}
                    style={{ width: 48, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none', textAlign: 'center', fontSize: 12 }}
                  />
                </div>
              </div>
            )}

          </div>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={10} /> 交互行为 / Behaviors
            </div>
          </div>
          {selectedObj.behaviors?.length ? selectedObj.behaviors.map(b => (
            <div key={b.id} style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{b.name}</span>
              <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0' }}>{b.desc}</p>
            </div>
          )) : <div style={{ fontSize: 12, color: '#94a3b8' }}>暂无行为</div>}
        </section>
        <section>
          <button
            onClick={() => onDelete(selectedId)}
            style={{
              width: '100%', padding: '10px', background: '#fff1f2', color: '#e11d48',
              border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', marginTop: '20px'
            }}
          ><Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> 删除元素</button>

        </section>
      </div>
    </aside>
  );
};
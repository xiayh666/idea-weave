import { Layout, Palette, Play, Trash2, Zap } from "lucide-react";

export const PropertyPanel = ({ selectedObj, selectedId, updateObject, mode, onDelete }) => {
  if (!selectedObj || mode !== 'edit') {
    return (
      <aside style={styles.aside}>
        <div style={styles.emptyContainer}>
          <div style={styles.emptyIcon}>
            {mode === 'play' ? <Play size={40} color="#3b82f6" /> : <Layout size={40} />}
          </div>
          <p style={styles.emptyTitle}>
            {mode === 'play' ? '交互预览已开启' : '未选择任何对象'}
          </p>
          <p style={styles.emptySubTitle}>
            {mode === 'play' ? '点击画布中的物体触发你定义的交互逻辑' : '请在画布或左侧列表中选择对象进行编辑'}
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside style={styles.aside}>
      <div style={styles.container}>
        <h3 style={styles.mainTitle}>外观属性</h3>

        {/* 布局部分 */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <Layout size={10} /> 布局 / Layout
          </div>
          <div style={styles.gridRow}>
            <div style={styles.gridItem}>
              <label style={styles.labelSmall}>宽度 W</label>
              <input 
                type="number" 
                value={Math.round(selectedObj.width) || 0} 
                onChange={(e) => updateObject(selectedId, { width: +e.target.value })}
                style={styles.input} 
              />
            </div>
            <div style={styles.gridItem}>
              <label style={styles.labelSmall}>高度 H</label>
              <input 
                type="number" 
                value={Math.round(selectedObj.height) || 0} 
                onChange={(e) => updateObject(selectedId, { height: +e.target.value })}
                style={styles.input} 
              />
            </div>
          </div>
        </section>

        {/* 样式部分 */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <Palette size={10} /> 样式 / Style
          </div>
          <div style={styles.flexColumn}>
            <div style={styles.rowBetween}>
              <label style={styles.labelNormal}>填充颜色</label>
              <input 
                type="color" 
                value={selectedObj.fillColor} 
                onChange={(e) => updateObject(selectedId, { fillColor: e.target.value })}
                style={styles.colorPicker} 
              />
            </div>

            {selectedObj.type === 'rect' && (
              <div style={styles.rowBetween}>
                <label style={styles.labelNormal}>圆角半径</label>
                <div style={styles.flexCenterGap}>
                  <input
                    type="range"
                    min="0"
                    max={Math.min(selectedObj.width, selectedObj.height) / 2}
                    value={selectedObj.borderRadius || 0}
                    onChange={(e) => updateObject(selectedId, { borderRadius: +e.target.value })}
                    style={styles.rangeInput}
                  />
                  <input
                    type="number"
                    min="0"
                    value={Math.round(selectedObj.borderRadius) || 0}
                    onChange={(e) => updateObject(selectedId, { borderRadius: +e.target.value })}
                    style={styles.numberInputSmall}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 交互部分 */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <Zap size={10} /> 交互行为 / Behaviors
          </div>
          {selectedObj.behaviors?.length ? selectedObj.behaviors.map(b => (
            <div key={b.id} style={styles.behaviorCard}>
              <span style={styles.behaviorName}>{b.name}</span>
              <p style={styles.behaviorDesc}>{b.desc}</p>
            </div>
          )) : <div style={styles.emptyText}>暂无行为</div>}
        </section>

        {/* 操作部分 */}
        <section>
          <button onClick={() => onDelete(selectedId)} style={styles.deleteButton}>
            <Trash2 size={14} style={styles.inlineIcon} /> 删除元素
          </button>
        </section>
      </div>
    </aside>
  );
};

// 样式定义
const styles = {
  aside: {
    width: 288,
    borderLeft: '1px solid #e2e8f0',
    backgroundColor: 'white',
    overflowY: 'auto'
  },
  container: {
    padding: 16
  },
  emptyContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    textAlign: 'center',
    color: '#94a3b8'
  },
  emptyIcon: {
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: '#64748b'
  },
  emptySubTitle: {
    fontSize: 12,
    marginTop: 8
  },
  mainTitle: {
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 24
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12
  },
  gridItem: {
    display: 'flex',
    flexDirection: 'column'
  },
  labelSmall: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4
  },
  labelNormal: {
    fontSize: 14
  },
  input: {
    width: '100%',
    padding: 6,
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    outline: 'none',
    fontSize: 12
  },
  flexColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  rowBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  colorPicker: {
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  },
  flexCenterGap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  rangeInput: {
    width: 60,
    cursor: 'pointer'
  },
  numberInputSmall: {
    width: 48,
    padding: '4px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    outline: 'none',
    textAlign: 'center',
    fontSize: 12
  },
  behaviorCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #f1f5f9',
    marginBottom: 8
  },
  behaviorName: {
    fontSize: 12,
    fontWeight: 600
  },
  behaviorDesc: {
    fontSize: 10,
    color: '#64748b',
    margin: '4px 0 0'
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8'
  },
  deleteButton: {
    width: '100%',
    padding: '10px',
    background: '#fff1f2',
    color: '#e11d48',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  inlineIcon: {
    marginRight: '6px'
  }
};
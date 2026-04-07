import { Layout, Palette, Play, Trash2, Zap } from "lucide-react";
import { useState } from "react";

const BEHAVIOR_TRIGGERS = [
  { value: 'onClick', label: 'onClick - 点击' },
  { value: 'onHover', label: 'onHover - 悬停' },
  { value: 'onDrag', label: 'onDrag - 拖拽' },
  { value: 'onTimer', label: 'onTimer - 定时器' }
];

const BEHAVIOR_ACTIONS = [
  { value: 'modify', label: 'Modify / 修改属性' },
  { value: 'move', label: 'Move / 移动' },
  { value: 'scale', label: 'Scale / 缩放' },
  { value: 'fade', label: 'Fade / 淡入淡出' },
  { value: 'launch', label: 'Launch / 发射' }
];

export const PropertyPanel = ({ selectedObj, selectedId, updateObject, mode, onDelete, onAddBehavior }) => {
  const [newBehavior, setNewBehavior] = useState({
    trigger: 'onClick',
    action: 'modify',
    color: '#3b82f6',
    duration: 500,
    dx: 0,
    dy: -240,
    scaleX: 1.2,
    scaleY: 1.2,
    opacity: 0.5,
    spin: 360,
    addSpin: true,
    name: ''
  });

  const handleNewBehaviorChange = (field, value) => {
    setNewBehavior(prev => ({ ...prev, [field]: value }));
  };

  const buildBehaviorParams = () => {
    switch (newBehavior.action) {
      case 'modify':
        return { color: newBehavior.color };
      case 'move':
        return {
          dx: Number(newBehavior.dx) || 0,
          dy: Number(newBehavior.dy) || 0
        };
      case 'scale':
        return {
          scaleX: Number(newBehavior.scaleX) || 1,
          scaleY: Number(newBehavior.scaleY) || 1
        };
      case 'fade':
        return {
          opacity: Math.max(0, Math.min(1, Number(newBehavior.opacity) || 0.5))
        };
      case 'launch':
        return {
          dx: Number(newBehavior.dx) || 0,
          dy: Number(newBehavior.dy) || 0,
          duration: Math.max(50, Number(newBehavior.duration) || 500),
          spin: Number(newBehavior.spin) || 0,
          addSpin: Boolean(newBehavior.addSpin)
        };
      default:
        return {};
    }
  };

  const handleCreateBehavior = () => {
    if (!onAddBehavior) return;
    const params = buildBehaviorParams();
    const behavior = {
      id: `bh-${Date.now()}`,
      name: newBehavior.name || `${newBehavior.trigger}-${newBehavior.action}`,
      trigger: newBehavior.trigger,
      behaviorTree: {
        node: 'action',
        name: newBehavior.action,
        params,
        duration: Number(newBehavior.duration) || 500
      }
    };
    onAddBehavior(behavior);
    setNewBehavior(prev => ({ ...prev, name: '', duration: 500 }));
  };

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
              <Zap size={10} /> 行为 / Behaviors
            </div>
            <div style={styles.behaviorList}>
              {selectedObj.behaviors?.length ? selectedObj.behaviors.map(b => (
                <div key={b.id} style={styles.behaviorEntry}>
                  <div style={styles.behaviorEntryTop}>
                    <span style={styles.behaviorEntryTitle}>{b.trigger} · {b.behaviorTree?.name || b.name}</span>
                    {b.behaviorTree?.duration && (
                      <span style={styles.behaviorEntryMeta}>{b.behaviorTree.duration}ms</span>
                    )}
                  </div>
                  <p style={styles.behaviorDesc}>
                    {b.behaviorTree?.params ? JSON.stringify(b.behaviorTree.params) : '无参数'}
                  </p>
                </div>
              )) : <div style={styles.emptyText}>暂无行为</div>}
            </div>
            <div style={styles.behaviorForm}>
              <div style={styles.formRow}>
                <label style={styles.behaviorFormLabel}>触发器</label>
                <select
                  value={newBehavior.trigger}
                  onChange={(e) => handleNewBehaviorChange('trigger', e.target.value)}
                  style={styles.behaviorFormInput}
                >
                  {BEHAVIOR_TRIGGERS.map(trigger => (
                    <option key={trigger.value} value={trigger.value}>{trigger.label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formRow}>
                <label style={styles.behaviorFormLabel}>动作</label>
                <select
                  value={newBehavior.action}
                  onChange={(e) => handleNewBehaviorChange('action', e.target.value)}
                  style={styles.behaviorFormInput}
                >
                  {BEHAVIOR_ACTIONS.map(action => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formRow}>
                <label style={styles.behaviorFormLabel}>持续 (ms)</label>
                <input
                  type="number"
                  min="0"
                  value={newBehavior.duration}
                  onChange={(e) => handleNewBehaviorChange('duration', e.target.value)}
                  style={styles.behaviorFormInput}
                />
              </div>
              {newBehavior.action === 'modify' && (
                <div style={styles.formRow}>
                  <label style={styles.behaviorFormLabel}>颜色</label>
                  <input
                    type="color"
                    value={newBehavior.color}
                    onChange={(e) => handleNewBehaviorChange('color', e.target.value)}
                    style={styles.colorPicker}
                  />
                </div>
              )}
              {newBehavior.action === 'move' && (
                <div style={styles.formRow}>
                  <label style={styles.behaviorFormLabel}>偏移</label>
                  <div style={styles.fieldGroup}>
                    <input
                      type="number"
                      placeholder="dx"
                      value={newBehavior.dx}
                      onChange={(e) => handleNewBehaviorChange('dx', e.target.value)}
                      style={styles.behaviorFormInput}
                    />
                    <input
                      type="number"
                      placeholder="dy"
                      value={newBehavior.dy}
                      onChange={(e) => handleNewBehaviorChange('dy', e.target.value)}
                      style={styles.behaviorFormInput}
                    />
                  </div>
                </div>
              )}
              {newBehavior.action === 'scale' && (
                <div style={styles.formRow}>
                  <label style={styles.behaviorFormLabel}>缩放</label>
                  <div style={styles.fieldGroup}>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="scaleX"
                      value={newBehavior.scaleX}
                      onChange={(e) => handleNewBehaviorChange('scaleX', e.target.value)}
                      style={styles.behaviorFormInput}
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="scaleY"
                      value={newBehavior.scaleY}
                      onChange={(e) => handleNewBehaviorChange('scaleY', e.target.value)}
                      style={styles.behaviorFormInput}
                    />
                  </div>
                </div>
              )}
              {newBehavior.action === 'fade' && (
                <div style={styles.formRow}>
                  <label style={styles.behaviorFormLabel}>透明度</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newBehavior.opacity}
                    onChange={(e) => handleNewBehaviorChange('opacity', e.target.value)}
                    style={styles.behaviorFormInput}
                  />
                </div>
              )}
              {newBehavior.action === 'launch' && (
                <>
                  <div style={styles.formRow}>
                    <label style={styles.behaviorFormLabel}>偏移 dx / dy</label>
                    <div style={styles.fieldGroup}>
                      <input
                        type="number"
                        placeholder="dx"
                        value={newBehavior.dx}
                        onChange={(e) => handleNewBehaviorChange('dx', e.target.value)}
                        style={styles.behaviorFormInput}
                      />
                      <input
                        type="number"
                        placeholder="dy"
                        value={newBehavior.dy}
                        onChange={(e) => handleNewBehaviorChange('dy', e.target.value)}
                        style={styles.behaviorFormInput}
                      />
                    </div>
                  </div>
                  <div style={styles.formRow}>
                    <label style={styles.behaviorFormLabel}>旋转</label>
                    <div style={styles.fieldGroup}>
                      <input
                        type="number"
                        placeholder="spin"
                        value={newBehavior.spin}
                        onChange={(e) => handleNewBehaviorChange('spin', e.target.value)}
                        style={styles.behaviorFormInput}
                      />
                      <label style={styles.addSpinWrapper}>
                        <input
                          type="checkbox"
                          checked={!!newBehavior.addSpin}
                          onChange={(e) => handleNewBehaviorChange('addSpin', e.target.checked)}
                        />
                        添加旋转
                      </label>
                    </div>
                  </div>
                </>
              )}
              <div style={styles.formRow}>
                <label style={styles.behaviorFormLabel}>名称</label>
                <input
                  type="text"
                  value={newBehavior.name}
                  onChange={(e) => handleNewBehaviorChange('name', e.target.value)}
                  placeholder="行为名称"
                  style={styles.behaviorFormInput}
                />
              </div>
              <button type="button" onClick={handleCreateBehavior} style={styles.addBehaviorButton}>
                + 添加行为
              </button>
            </div>
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
  behaviorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12
  },
  behaviorEntry: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    border: '1px solid #e2e8f0'
  },
  behaviorEntryTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  behaviorEntryTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#1e293b'
  },
  behaviorEntryMeta: {
    fontSize: 11,
    color: '#94a3b8'
  },
  behaviorForm: {
    border: '1px dashed #cbd5e1',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff'
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 8
  },
  behaviorFormLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
  behaviorFormInput: {
    width: '100%',
    padding: 6,
    borderRadius: 6,
    border: '1px solid #e2e8f0',
    outline: 'none',
    fontSize: 13
  },
  fieldGroup: {
    display: 'flex',
    gap: 8
  },
  addSpinWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#475569'
  },
  addBehaviorButton: {
    marginTop: 12,
    padding: '8px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
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

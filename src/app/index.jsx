import { Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, Text, TouchableOpacity, View } from 'react-native';
import { AiChatFooter } from '../components/AiChatFooter';
import Header from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { PropertyPanel } from '../components/PropertyPanel';
import { Toolbar } from '../components/Toolbar';
import { askAI } from '../core/agent';
import { CanvasRenderer, useCanvas } from '../hooks/useCanvas';
import { styles } from './index_style';

const SLINGSHOT_ID = 'slingshot';
const SLINGSHOT_BASE_POSITION = { x: 420, y: 420 };
const SLINGSHOT_LAUNCH_THRESHOLD = 14;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const rectsOverlap = (a, b) => {
  if (!a || !b) return false;
  const ax1 = a.x;
  const ay1 = a.y;
  const ax2 = a.x + (a.width || 0);
  const ay2 = a.y + (a.height || 0);
  const bx1 = b.x;
  const by1 = b.y;
  const bx2 = b.x + (b.width || 0);
  const by2 = b.y + (b.height || 0);
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isMobile = Platform.OS !== 'web';

const INITIAL_OBJECTS = [
  {
    id: 'obj-1',
    name: 'Object_1',
    type: 'rect',
    x: 100,
    y: 100,
    width: 80,
    height: 80,
    fillColor: '#3862f6',
    borderRadius: 8,
    behaviors: [
      {
        id: 'bh-1',
        name: '初始旋转',
        action: 'rotate',
        duration: 1.0,
        params: { rotation: 360 },
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ]
  },
  {
    id: 'obj-2',
    name: 'Title_Text',
    type: 'text',
    x: 100,
    y: 50,
    text: 'Hello IdeaWeave',
    fontSize: 18,
    fillColor: '#1e293b',
    behaviors: [
      {
        id: 'bh-2',
        name: '初始淡入',
        action: 'fade',
        duration: 1.0,
        params: { opacity: 1 },
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ]
  },
  {
    id: "rect-1",
    name: "rect-1",
    type: "rect",
    width: 50,
    height: 50,
    x: 100,
    y: 100,
    fillColor: "#00ff00",
    behaviors: [
      {
        id: "rect-1",
        trigger: "onClick",
        behaviorTree: {
          node: "action",
          name: "modify",
          params: { color: "red" }
        }
      }
    ]
  },
  {
    id: 'obj-3',
    name: '互动方块',
    type: 'rect',
    x: 320,
    y: 220,
    width: 110,
    height: 110,
    fillColor: '#10b981',
    borderRadius: 12,
    behaviors: [
      {
        id: 'bh-3',
        trigger: 'onClick',
        behaviorTree: {
          node: 'sequence',
          children: [
            {
              node: 'action',
              name: 'scale',
              params: { scaleX: 1.25, scaleY: 1.25 },
              duration: 400
            },
            {
              node: 'action',
              name: 'wait',
              params: { duration: 300 }
            },
            {
              node: 'action',
              name: 'scale',
              params: { scaleX: 1.0, scaleY: 1.0 },
              duration: 300
            }
          ]
        }
      },
      {
        id: 'bh-4',
        trigger: 'onDrag',
        behaviorTree: {
          node: 'action',
          name: 'modify',
          params: {
            color: '#ef4444'
          }
        }
      }
      ]
    },
  {
    id: 'launcher-base',
    name: '发射器',
    type: 'rect',
      x: 320,
      y: 440,
      width: 220,
      height: 50,
      fillColor: '#b45309',
      borderRadius: 26,
      behaviors: [
        {
          id: 'bh-launch',
          trigger: 'onClick',
        behaviorTree: {
          node: 'inside',
          child: {
            node: 'action',
            name: 'launch',
            params: {
              dx: 800,
              dy: 0,
              addSpin: false,
              spin: 0
            }
          }
        }
      }
    ]
  },
  {
      id: 'projectile-1',
      name: '发射物',
      type: 'circle',
      x: 330,
      y: 400,
      width: 40,
      height: 40,
      fillColor: '#f97316',
    behaviors: []
  },
  {
    id: 'box-area',
    name: '箱子',
    type: 'rect',
    x: 520,
    y: 420,
    width: 240,
    height: 120,
    fillColor: '#64748b',
    borderRadius: 12,
    behaviors: [
      {
        id: 'box-click',
        trigger: 'onClick',
        behaviorTree: {
          node: 'inside',
          child: {
            node: 'action',
            name: 'modify',
            params: {
              color: '#dc2626'
            }
          }
        }
      }
    ]
  },
  {
    id: 'box-item-1',
    name: '箱内物体1',
    type: 'rect',
    x: 540,
    y: 450,
    width: 60,
    height: 60,
    fillColor: '#fbbf24',
    behaviors: []
  },
  {
    id: 'box-item-2',
    name: '箱内物体2',
    type: 'rect',
    x: 620,
    y: 450,
    width: 60,
    height: 60,
    fillColor: '#0ea5e9',
    behaviors: []
  }
];

// 存储对话历史
export default function App() {
  const [objects, setObjects] = useState(INITIAL_OBJECTS);
  const [selectedId, setSelectedId] = useState(INITIAL_OBJECTS[0].id);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('edit');
  const [activeTool, setActiveTool] = useState('select');
  const [activeTab, setActiveTab] = useState('canvas');
  const [aiStatus, setAiStatus] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  const handleAddCustomObject = () => {
    const newId = `obj-${Date.now()}`;
    const newObj = {
      id: newId,
      name: `Custom_${objects.length + 1}`,
      type: 'rect',
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 100,
      width: 60, height: 60,
      fillColor: '#8b5cf6',
      borderRadius: 8,
      behaviors: []
    };
    setObjects([...objects, newObj]);
    setActiveTool('select');
    handleSelect(newId);
  };

  const selectedObj = objects.find(o => o.id === selectedId);

  const deleteObject = (id) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    setSelectedId(null);
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

  const handleAddBehavior = useCallback((behavior) => {
    if (!selectedId) return;
    const currentBehaviors = selectedObj?.behaviors || [];
    updateObject(selectedId, { behaviors: [...currentBehaviors, behavior] });
  }, [selectedId, selectedObj, updateObject]);

  const { manager: canvasManager, canvasRef } = useCanvas(objects, setObjects, mode, setSelectedId);
  const triggerBehavior = canvasManager?.emitTrigger?.bind(canvasManager);

  const slingshotDistanceRef = useRef(0);
  const lastLaunchRef = useRef(0);

  useEffect(() => {
    const slingshot = objects.find(o => o.id === SLINGSHOT_ID);
    if (!slingshot) return;
    const dx = slingshot.x - SLINGSHOT_BASE_POSITION.x;
    const dy = slingshot.y - SLINGSHOT_BASE_POSITION.y;
    const distance = Math.hypot(dx, dy);
    const now = Date.now();

    if (distance > SLINGSHOT_LAUNCH_THRESHOLD && slingshotDistanceRef.current <= SLINGSHOT_LAUNCH_THRESHOLD && now - lastLaunchRef.current > 300) {
      const overlapped = objects.find(obj => obj.id !== SLINGSHOT_ID && rectsOverlap(slingshot, obj));
      if (overlapped) {
        const vector = {
          x: clamp(-dx * 1.5, -210, 210),
          y: clamp(-dy * 1.4, -210, 210)
        };
        setObjects(prev => prev.map(obj => {
          if (obj.id === overlapped.id) {
            return {
              ...obj,
              x: clamp(obj.x + vector.x, 0, 750),
              y: clamp(obj.y + vector.y, 0, 550)
            };
          }
          if (obj.id === SLINGSHOT_ID) {
            return {
              ...obj,
              x: SLINGSHOT_BASE_POSITION.x,
              y: SLINGSHOT_BASE_POSITION.y
            };
          }
          return obj;
        }));
        lastLaunchRef.current = now;
      }
    }

    slingshotDistanceRef.current = distance;
  }, [objects]);

  useEffect(() => {
    if (canvasManager) {
      canvasManager.setTool(activeTool);
    }
  }, [activeTool, canvasManager]);

  const appendHistory = (entry) => {
    setConversationHistory(prev => {
      const next = [...prev, entry];
      return next.slice(-4);
    });
  };



// 在你的组件内部
const handleAICommand = async (userInput) => {
  if (!userInput.trim()) return;
  setAiStatus('AI 正在处理中…');
  setAiLoading(true);
  const historySeed = { input: userInput, timestamp: Date.now() };

  try {
    const response = await askAI(userInput, selectedId);
    if (!response.success) {
      const message = response.error || 'AI 返回失败';
      setAiStatus(message);
      appendHistory({ ...historySeed, status: 'error', message });
      return;
    }

    const action = response.action;
    const baseUpdate = { ...historySeed, op: action.op };

    switch (action.op) {
      case 'CREATE': {
        if (!action.data) {
          const message = 'AI 未提供创建数据';
          setAiStatus(message);
          appendHistory({ ...baseUpdate, status: 'error', message });
          break;
        }
        const newId = action.data.id || `ai-obj-${Date.now()}`;
        const newObj = {
          id: newId,
          name: action.data.name || action.data.type || `AI_${newId}`,
          type: action.data.type || 'rect',
          x: action.data.x ?? 60,
          y: action.data.y ?? 60,
          width: action.data.width ?? 60,
          height: action.data.height ?? 60,
          fillColor: action.data.fillColor || '#8b5cf6',
          borderRadius: action.data.borderRadius ?? 8,
          text: action.data.text || '',
          fontSize: action.data.fontSize ?? 16,
          stroke: action.data.stroke,
          strokeWidth: action.data.strokeWidth,
          behaviors: action.data.behaviors || [],
        };
        setObjects(prev => [...prev, newObj]);
        setSelectedId(newId);
        setAiStatus('AI 已创建对象');
        appendHistory({ ...baseUpdate, status: 'success', message: `创建 ${newObj.name}` });
        break;
      }
      case 'MODIFY':
      case 'UPDATE': {
        const targetId = (action.ids && action.ids[0]) || action.data?.id || selectedId;
        if (!targetId) {
          const message = '请选择一个对象后再修改';
          setAiStatus(message);
          appendHistory({ ...baseUpdate, status: 'error', message });
          break;
        }
        const properties = action.properties || action.data?.properties || action.data || {};
        if (Object.keys(properties).length === 0) {
          const message = 'AI 没有提供需要修改的字段';
          setAiStatus(message);
          appendHistory({ ...baseUpdate, status: 'error', message });
          break;
        }
        updateObject(targetId, properties);
        setAiStatus('AI 修改已应用');
        appendHistory({ ...baseUpdate, status: 'success', message: `修改 ${targetId}` });
        break;
      }
      case 'DELETE': {
        if (action.ids === 'all') {
          setObjects([]);
          setSelectedId(null);
          setAiStatus('AI 清空了画布');
          appendHistory({ ...baseUpdate, status: 'success', message: '删除全部' });
          break;
        }
        const idsToDelete = action.ids || (action.data?.ids ? action.data.ids : (action.data?.id ? [action.data.id] : []));
        if (!idsToDelete || idsToDelete.length === 0) {
          const message = '未找到需要删除的对象';
          setAiStatus(message);
          appendHistory({ ...baseUpdate, status: 'error', message });
          break;
        }
        idsToDelete.forEach(id => deleteObject(id));
        if (idsToDelete.includes(selectedId)) {
          setSelectedId(null);
        }
        setAiStatus('AI 删除了对象');
        appendHistory({ ...baseUpdate, status: 'success', message: `删除 ${idsToDelete.join(',')}` });
        break;
      }
      default: {
        const message = 'AI 返回了未识别的操作';
        console.warn(message, action);
        setAiStatus(message);
        appendHistory({ ...baseUpdate, status: 'error', message });
      }
    }
  } catch (error) {
    const message = error?.message || 'AI 处理失败';
    console.error('AI 交互失败', error);
    setAiStatus(message);
    appendHistory({ ...historySeed, status: 'error', message });
  } finally {
    setAiLoading(false);
    setInput('');
  }
};

const handleClearCanvas = () => {
  setObjects(INITIAL_OBJECTS);
  setSelectedId(INITIAL_OBJECTS[0].id);
};

if (isMobile) {
  return (
    <View style={styles.mobileContainer}>
      <Header mode={mode} setMode={setMode} setActiveTool={setActiveTool} />

      <View style={styles.mobileTabBar}>
        <TouchableOpacity
          style={[styles.mobileTab, activeTab === 'objects' && styles.mobileTabActive]}
          onPress={() => setActiveTab('objects')}
        >
          <Text style={[styles.mobileTabText, activeTab === 'objects' && styles.mobileTabTextActive]}>对象</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mobileTab, activeTab === 'canvas' && styles.mobileTabActive]}
          onPress={() => setActiveTab('canvas')}
        >
          <Text style={[styles.mobileTabText, activeTab === 'canvas' && styles.mobileTabTextActive]}>画布</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mobileTab, activeTab === 'properties' && styles.mobileTabActive]}
          onPress={() => setActiveTab('properties')}
        >
          <Text style={[styles.mobileTabText, activeTab === 'properties' && styles.mobileTabTextActive]}>属性</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mobileContent}>
        {activeTab === 'objects' && (
          <ObjectList objects={objects} selectedId={selectedId} handleSelect={handleSelect} mode={mode} />
        )}

        {activeTab === 'canvas' && (
          <View style={styles.mobileCanvasContainer}>
            <View style={styles.mobileToolbarWrapper}>
              <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} onAddObject={handleAddCustomObject} mode={mode} />
              {mode === 'edit' && (
                <TouchableOpacity
                  onPress={handleClearCanvas}
                  style={styles.mobileClearButton}
                >
                  <Trash2 size={16} color="#dc2626" />
                  <Text style={styles.mobileClearButtonText}>清空</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.mobileCanvasWrapper}>
              <CanvasRenderer
                objects={objects}
                mode={mode}
                canvasRef={canvasRef}
                onSelect={setSelectedId}
                onModify={updateObject}
                onDelete={deleteObject}
                onTrigger={triggerBehavior}
              />
            </View>

            <View style={styles.mobileStatusBar}>
              <View style={[styles.statusDot, { backgroundColor: mode === 'play' ? '#3b82f6' : '#94a3b8' }]} />
              <Text style={styles.statusText}>
                {mode === 'play' ? '预览模式' : '编辑模式'}
              </Text>
            </View>
          </View>
        )}

          {activeTab === 'properties' && (
            <PropertyPanel
              selectedObj={selectedObj}
              selectedId={selectedId}
              updateObject={updateObject}
              onDelete={deleteObject}
              mode={mode}
              onAddBehavior={handleAddBehavior}
            />
          )}
      </View>

      <AiChatFooter
        input={input}
        setInput={setInput}
        handleAICommand={handleAICommand}
        statusMessage={aiStatus}
        loading={aiLoading}
        history={conversationHistory}
      />
    </View>
  );
}

// Web端布局 - 优化布局避免重叠
return (
  <View style={styles.container}>
    <Header mode={mode} setMode={setMode} setActiveTool={setActiveTool} />

    <View style={styles.mainContent}>
      {/* 左侧对象列表 */}
      <View style={styles.leftSidebar}>
        <ObjectList objects={objects} selectedId={selectedId} handleSelect={handleSelect} mode={mode} />
      </View>

      {/* 中间画布区域 */}
      <View style={styles.centerArea}>
        <View style={styles.canvasContainer}>
          {/* 顶部工具栏 */}
          <View style={styles.toolbarWrapper}>
            <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} onAddObject={handleAddCustomObject} mode={mode} />

            {mode === 'edit' && (
              <TouchableOpacity
                onPress={handleClearCanvas}
                style={styles.clearButton}
              >
                <Trash2 size={14} color="#dc2626" />
                <Text style={styles.clearButtonText}>清空画布</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 画布内容 */}
          <View style={styles.canvasWrapper}>
            {Platform.OS === 'web' && (
              <View style={styles.webGrid} />
            )}

              <CanvasRenderer
                objects={objects}
                mode={mode}
                canvasRef={canvasRef}
                onSelect={setSelectedId}
                onModify={updateObject}
                onDelete={deleteObject}
                onTrigger={triggerBehavior}
              />
          </View>

          {/* 底部状态栏 */}
          <View style={styles.statusBar}>
            <View style={[styles.statusDot, { backgroundColor: mode === 'play' ? '#3b82f6' : '#94a3b8' }]} />
            <Text style={styles.statusText}>
              {mode === 'play' ? 'INTERACTIVE PREVIEW' : 'DESIGN MODE'}
            </Text>
          </View>
        </View>
      </View>

      {/* 右侧属性面板 */}
      <View style={styles.rightSidebar}>
        <PropertyPanel
          selectedObj={selectedObj}
          selectedId={selectedId}
          updateObject={updateObject}
          onDelete={deleteObject}
          mode={mode}
          onAddBehavior={handleAddBehavior}
        />
      </View>
    </View>

    <AiChatFooter
      input={input}
      setInput={setInput}
      handleAICommand={handleAICommand}
      statusMessage={aiStatus}
      loading={aiLoading}
      history={conversationHistory}
    />
  </View>
);
}

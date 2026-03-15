import { Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, Text, TouchableOpacity, View } from 'react-native';
import { AiChatFooter } from '../components/AiChatFooter';
import Header from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { PropertyPanel } from '../components/PropertyPanel';
import { Toolbar } from '../components/Toolbar';
import { askAI } from '../core/agent';
import { CanvasRenderer, useCanvas } from '../hooks/useCanvas';
import { styles } from './index_style';

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
  }
];

// 存储对话历史
let conversationHistory = [];


export default function App() {
  const [objects, setObjects] = useState(INITIAL_OBJECTS);
  const [selectedId, setSelectedId] = useState(INITIAL_OBJECTS[0].id);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('edit');
  const [activeTool, setActiveTool] = useState('select');
  const [activeTab, setActiveTab] = useState('canvas');

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

  const { manager: canvasManager, canvasRef } = useCanvas(objects, setObjects, mode, setSelectedId);

  useEffect(() => {
    if (canvasManager) {
      canvasManager.setTool(activeTool);
    }
  }, [activeTool, canvasManager]);



// 在你的组件内部
const handleAICommand = async (userInput) => {
  if (!userInput.trim()) return;

  try {
    // 1. 调用 AI，并传入当前选中的物体 ID（作为上下文）
    const action = await askAI(userInput, selectedId); 
    
    // 2. 根据 AI 返回的指令类型进行路由
    switch (action.op) {
      case 'CREATE':
        console.log(action)
        console.log(action.data.behaviors)
        if (action.data) {
          const newId = action.data.id || `ai-obj-${Date.now()}`;
          const newObj = {
            ...action.data,
            id: newId,
            behaviors: action.data.behaviors || [] // 透传行为树
          };
          
          // 更新 React 状态，把新物体加进画布
          setObjects(prev => [...prev, newObj]);
          // 可选：创建完自动选中它
          setSelectedId(newId);
          console.log("create")
        }
        break;

      case 'MODIFY':
        if (action.properties) {
          // 目标 ID：优先用 AI 识别出的 ID，否则用当前用户选中的 ID
          const targetId = action.properties.id || selectedId;
          
          if (targetId) {
            // 调用你原有的 updateObject 函数
            updateObject(targetId, action.properties);
          } else {
            alert("请先选中一个物体，或者在描述里说清楚修改哪一个！");
          }
        }
        break;

      case 'DELETE':
        if (action.ids === 'all') {
          // 清空画布
          setObjects([]);
          setSelectedId(null);
        } else {
          // 删除特定物体
          const targetId = (action.ids && action.ids[0]) ? action.ids[0] : selectedId;
          if (targetId) {
             // 调用你原有的 deleteObject 函数
            deleteObject(targetId);
            if (selectedId === targetId) setSelectedId(null);
          } else {
            alert("请先选中要删除的物体！");
          }
        }
        break;

      default:
        console.warn("未知的操作类型:", action.op);
    }

  } catch (error) {
    console.error("AI 处理失败:", error);
    alert("AI 助手开小差了，请换个说法试试~");
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
          <PropertyPanel selectedObj={selectedObj} selectedId={selectedId} updateObject={updateObject} onDelete={deleteObject} mode={mode} />
        )}
      </View>

      <AiChatFooter input={input} setInput={setInput} handleAICommand={handleAICommand} />
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
        <PropertyPanel selectedObj={selectedObj} selectedId={selectedId} updateObject={updateObject} onDelete={deleteObject} mode={mode} />
      </View>
    </View>

    <AiChatFooter input={input} setInput={setInput} handleAICommand={handleAICommand} />
  </View>
);
}

import { Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, Text, TouchableOpacity, View } from 'react-native';
import { AiChatFooter } from '../components/AiChatFooter';
import Header from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { PropertyPanel } from '../components/PropertyPanel';
import { Toolbar } from '../components/Toolbar';
import { CanvasRenderer, useCanvas } from '../hooks/useCanvas';
import utils from '../utils/utils';
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

  


  const handleAICommand = async (cmd) => {
    console.log("AI start")
    if (!cmd.trim()) return;
    try {
      const result = await askAI(cmd, objects, selectedObj);
      if (result.type === 'CREATE') {
        const newId = `obj-${Date.now()}`;
        
        // 确保尺寸在合理范围内
        const width = Math.max(10, Math.min(200, result.size?.width || 60));
        const height = Math.max(10, Math.min(200, result.size?.height || 60));
        
        // 处理位置：优先使用相对位置，其次使用绝对位置，最后使用随机位置
        let x, y;
        
        if (result.relativePosition && result.relativePosition.targetId) {
          // 使用相对位置
          const targetObj = objects.find(o => o.id === result.relativePosition.targetId);
          if (targetObj) {
            const relativePos = utils.calculateRelativePosition(
              result.relativePosition,
              targetObj,
              { width, height }
            );
            if (relativePos) {
              x = relativePos.x;
              y = relativePos.y;
            } else {
              // 相对位置计算失败，使用默认位置
              x = Math.max(0, Math.min(750, result.position?.x || 50 + Math.random() * 100));
              y = Math.max(0, Math.min(550, result.position?.y || 50 + Math.random() * 100));
            }
          } else {
            // 参考物体不存在，使用默认位置
            x = Math.max(0, Math.min(750, result.position?.x || 50 + Math.random() * 100));
            y = Math.max(0, Math.min(550, result.position?.y || 50 + Math.random() * 100));
          }
        } else if (result.position) {
          // 使用绝对位置
          x = Math.max(0, Math.min(750, result.position.x));
          y = Math.max(0, Math.min(550, result.position.y));
        } else {
          // 使用随机位置
          x = 50 + Math.random() * 100;
          y = 50 + Math.random() * 100;
        }
        
        // 校验颜色格式
        const validColor = utils.validateColor(result.color);
        const validStroke = utils.validateColor(result.stroke);
        
        const newObj = {
          id: newId,
          name: result.name || `${result.shape || 'rect'}_${objects.length + 1}`,
          type: result.shape || 'rect',
          x: x,
          y: y,
          width: width,
          height: height,
          fillColor: validColor,
          borderRadius: result.borderRadius || 8,
          text: result.text || '',
          fontSize: Math.max(8, Math.min(48, result.fontSize || 16)),
          path: result.path || '', // 支持path类型
          stroke: validStroke || '#1e293b',
          strokeWidth: Math.max(1, Math.min(20, result.strokeWidth || 4)),
          behaviors: [
            {
              id: `bh-${Date.now()}`,
              name: '创建物体',
              action: 'scale',
              duration: 0.5,
              params: { scale: 1.1 },
              createdAt: new Date().toISOString(),
              createdBy: 'ai'
            }
          ]
        };
        
        setObjects([...objects, newObj]);
        setSelectedId(newId);
        
        // 添加创建动画效果
        setTimeout(() => {
          const ts = Date.now();
          updateObject(newId, {
            behaviors: [{ 
              id: `bh-${ts}`, 
              name: '创建动画',
              action: 'scale',
              duration: 0.5,
              params: { scale: 1.2 }
            }]
          });
        }, 100);
        
        // 添加视觉反馈
        if (isMobile) {
          const shapeName = result.shape === 'rect' ? '正方形' : 
                          result.shape === 'circle' ? '圆形' : 
                          result.shape === 'text' ? '文本' : 
                          result.shape === 'triangle' ? '三角形' :
                          result.shape === 'path' ? '路径' : '图形';
          alert(`AI 已成功绘制一个${validColor}的${shapeName}`);
        }
      } else if (result.type === 'MODIFY') {
        const targetIds = result.ids || (result.id ? [result.id] : []);
        if (targetIds.length > 0 && result.properties) {
          const properties = {};
          
          // 处理位置更新
          if (result.properties.position) {
            properties.x = Math.max(0, Math.min(750, result.properties.position.x));
            properties.y = Math.max(0, Math.min(550, result.properties.position.y));
          }
          
          // 处理尺寸更新
          if (result.properties.size) {
            properties.width = Math.max(10, Math.min(200, result.properties.size.width));
            properties.height = Math.max(10, Math.min(200, result.properties.size.height));
          }
          
          // 处理颜色更新，添加颜色校验
          if (result.properties.color) {
            properties.fillColor = utils.validateColor(result.properties.color);
          }
          
          // 处理描边属性
          if (result.properties.stroke) {
            properties.stroke = utils.validateColor(result.properties.stroke);
          }
          if (result.properties.strokeWidth) {
            properties.strokeWidth = Math.max(1, Math.min(20, result.properties.strokeWidth));
          }
          
          // 处理其他属性
          if (result.properties.text) {
            properties.text = result.properties.text;
          }
          if (result.properties.fontSize) {
            properties.fontSize = Math.max(8, Math.min(48, result.properties.fontSize));
          }
          if (result.properties.borderRadius) {
            properties.borderRadius = Math.max(0, Math.min(50, result.properties.borderRadius));
          }
          
          // 对所有目标物体应用修改
          targetIds.forEach(id => {
            updateObject(id, properties);
          });
        }
      } else if (result.type === 'ANIMATE') {
        const targetIds = result.ids || (result.id ? [result.id] : []);
        if (targetIds.length > 0 && result.action && result.params) {
          const ts = Date.now();
          let behaviorName = `点击${result.action}`;
          
          // 根据不同的动画类型构建更详细的行为名称
          switch (result.action) {
            case 'rotate':
              behaviorName = `旋转${result.params.rotation || 360}度`;
              break;
            case 'scale':
              behaviorName = `缩放${result.params.scale || 1.5}倍`;
              break;
            case 'move':
              if (result.params.moveTo) {
                behaviorName = `移动到(${result.params.moveTo.x}, ${result.params.moveTo.y})`;
              }
              break;
            case 'fade':
              behaviorName = `透明度变为${result.params.opacity || 0.5}`;
              break;
          }
          
          // 对所有目标物体应用动画
          targetIds.forEach(id => {
            updateObject(id, {
              behaviors: [{ 
                id: `bh-${ts}-${id}`, 
                name: behaviorName,
                action: result.action,
                duration: Math.max(0.5, Math.min(5, result.duration || 1)),
                params: result.params,
                createdAt: new Date().toISOString(),
                createdBy: 'ai'
              }]
            });
          });
        }
      } else if (result.type === 'DELETE') {
        const targetIds = result.ids || (result.id ? [result.id] : []);
        if (targetIds.length > 0) {
          targetIds.forEach(id => {
            deleteObject(id);
          });
        }
      }
      setInput('');
    } catch (error) {
      alert("AI 响应失败，请检查网络");
    }
    console.log("AI End");
    
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

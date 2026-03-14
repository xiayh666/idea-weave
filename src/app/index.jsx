import { Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AiChatFooter } from '../components/AiChatFooter';
import Header from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { PropertyPanel } from '../components/PropertyPanel';
import { Toolbar } from '../components/Toolbar';
import { CanvasRenderer, useCanvas } from '../hooks/useCanvas';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isMobile = Platform.OS !== 'web';

const INITIAL_OBJECTS = [
  { id: 'obj-1', name: 'Object_1', type: 'rect', x: 100, y: 100, width: 80, height: 80, fillColor: '#3862f6', borderRadius: 8, behaviors: [] },
  { id: 'obj-2', name: 'Title_Text', type: 'text', x: 100, y: 50, text: 'Hello IdeaWeave', fontSize: 18, fillColor: '#1e293b', behaviors: [] }
];

const askAI = async (userInput, currentObjects) => {
  const API_KEY = "sk-4ddc42fea38a4368b93263d55f0b59cd"; 
  const BASE_URL = "https://api.deepseek.com/v1/chat/completions";

  const systemPrompt = `你是一个绘图助手。请根据用户指令返回 JSON。
  当前物体列表：${JSON.stringify(currentObjects.map(o => ({id: o.id, name: o.name})))}
  如果是创建，返回：{"type":"CREATE", "shape":"rect", "color":"#3862f6"}
  如果是让某个物体动，返回：{"type":"ANIMATE", "id":"物体的id", "action":"旋转"}`;

  try {
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
        response_format: { type: "json_object" }
      })
    });

    const resData = await response.json();
    return JSON.parse(resData.choices[0].message.content);
  } catch (error) {
    console.error('AI API Error:', error);
    return { type: 'CREATE', shape: 'rect', color: '#3862f6' };
  }
};

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
      const result = await askAI(cmd, objects);
      console.log(result)
      if (result.type === 'CREATE') {
        const newId = `obj-${Date.now()}`;
        const newObj = {
          id: newId,
          name: `AI_Object_${objects.length + 1}`,
          type: result.shape || 'rect',
          x: 50 + Math.random() * 100,
          y: 50 + Math.random() * 100,
          width: 60, height: 60,
          fillColor: result.color || '#3862f6',
          borderRadius: 8,
          behaviors: []
        };
        setObjects([...objects, newObj]);
        setSelectedId(newId);
      } else if (result.type === 'ANIMATE') {
        const ts = Date.now();
        updateObject(result.id, {
          behaviors: [{ id: `bh-${ts}`, name: `点击${result.action}` }]
        });
      }
      setInput('');
    } catch (error) {
      alert("AI 响应失败，请检查网络");
    }
    console.log("AI End");
    
  };

  console.log(objects)

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
              <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} onAddObject={handleAddCustomObject} mode={mode} />
              
              <View style={styles.mobileCanvasWrapper}>
                <CanvasRenderer 
                  objects={objects} 
                  mode={mode} 
                  canvasRef={canvasRef} 
                  onSelect={setSelectedId} 
                  onModify={updateObject} 
                />
              </View>

              <View style={styles.mobileStatusBar}>
                <View style={[styles.statusDot, { backgroundColor: mode === 'play' ? '#3b82f6' : '#94a3b8' }]} />
                <Text style={styles.statusText}>
                  {mode === 'play' ? '预览模式' : '编辑模式'}
                </Text>
              </View>

              {mode === 'edit' && (
                <TouchableOpacity 
                  onPress={() => { setObjects(INITIAL_OBJECTS); setSelectedId(INITIAL_OBJECTS[0].id); }}
                  style={styles.mobileClearButton}
                >
                  <Trash2 size={14} color="#dc2626" />
                  <Text style={styles.clearButtonText}>清空</Text>
                </TouchableOpacity>
              )}
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

  return (
    <View style={styles.container}>
      <Header mode={mode} setMode={setMode} setActiveTool={setActiveTool} />

      <View style={styles.mainContent}>
        <ObjectList objects={objects} selectedId={selectedId} handleSelect={handleSelect} mode={mode} />

        <View style={styles.canvasArea}>
          {Platform.OS === 'web' && (
            <View style={styles.webGrid} />
          )}

          <View style={[
            styles.canvasContainer,
            { borderColor: mode === 'play' ? '#3b82f6' : '#f1f5f9' }
          ]}>
            <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} onAddObject={handleAddCustomObject} mode={mode} />

            <View style={{ flex: 1, overflow: 'hidden' }}>
              <CanvasRenderer objects={objects} mode={mode} canvasRef={canvasRef} onSelect={setSelectedId} onModify={updateObject} />
            </View>

            <View style={styles.statusLabel}>
              <View style={[styles.statusDot, { backgroundColor: mode === 'play' ? '#3b82f6' : '#94a3b8' }]} />
              <Text style={styles.statusText}>
                {mode === 'play' ? 'INTERACTIVE PREVIEW' : 'DESIGN MODE'}
              </Text>
            </View>

            {mode === 'edit' && (
              <TouchableOpacity 
                onPress={() => { setObjects(INITIAL_OBJECTS); setSelectedId(INITIAL_OBJECTS[0].id); }}
                style={styles.clearButton}
              >
                <Trash2 size={14} color="#dc2626" />
                <Text style={styles.clearButtonText}>清空画布</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <PropertyPanel selectedObj={selectedObj} selectedId={selectedId} updateObject={updateObject} onDelete={deleteObject} mode={mode} />
      </View>
      
      <AiChatFooter input={input} setInput={setInput} handleAICommand={handleAICommand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfcfc',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  canvasArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  webGrid: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.03,
    backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
    backgroundSize: '24px 24px',
  },
  canvasContainer: {
    position: 'relative',
    width: Platform.OS === 'web' ? 800 : '90%',
    height: Platform.OS === 'web' ? 600 : 450,
    backgroundColor: 'white',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
      web: { boxShadow: '0 0 24px rgba(0,0,0,0.05)' }
    })
  },
  statusLabel: {
    position: 'absolute',
    top: -24,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  clearButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#dc2626',
    marginLeft: 6,
  },
  
  // Mobile styles
  mobileContainer: {
    flex: 1,
    backgroundColor: '#fcfcfc',
  },
  mobileTabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    height: 44,
  },
  mobileTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mobileTabActive: {
    borderBottomColor: '#3b82f6',
  },
  mobileTabText: {
    fontSize: 14,
    color: '#64748b',
  },
  mobileTabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  mobileContent: {
    flex: 1,
  },
  mobileCanvasContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
  },
  mobileCanvasWrapper: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginTop: 10,
  },
  mobileStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  mobileClearButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    zIndex: 10,
  },
});

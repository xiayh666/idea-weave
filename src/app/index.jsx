import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { AiChatFooter } from '../components/AiChatFooter';
import Header from '../components/Header';
import { askAI } from '../core/agent';
import { useCanvas } from '../hooks/useCanvas';
import { INITIAL_OBJECTS } from './constants/initialObjects';
import { styles } from './index_style';
import { DesktopWorkspace } from './layouts/DesktopWorkspace';
import { MobileWorkspace } from './layouts/MobileWorkspace';

const isMobile = Platform.OS !== 'web';

export default function App() {
  const [objects, setObjects] = useState(INITIAL_OBJECTS);
  const [selectedId, setSelectedId] = useState(INITIAL_OBJECTS[0]?.id ?? null);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('edit');
  const [activeTool, setActiveTool] = useState('select');
  const [activeTab, setActiveTab] = useState('canvas');
  const [aiStatus, setAiStatus] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);

  const selectedObj = objects.find(o => o.id === selectedId);
  const { manager: canvasManager, canvasRef } = useCanvas(objects, setObjects, mode, setSelectedId);
  const triggerBehavior = canvasManager?.emitTrigger?.bind(canvasManager);

  const handleSelect = (id) => {
    if (mode !== 'edit') return;
    setSelectedId(id);
    if (canvasManager) {
      canvasManager.setActiveObjectById(id);
    }
  };

  const handleAddCustomObject = () => {
    const newId = `obj-${Date.now()}`;
    const newObj = {
      id: newId,
      name: `Custom_${objects.length + 1}`,
      type: 'rect',
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 100,
      width: 60,
      height: 60,
      fillColor: '#8b5cf6',
      borderRadius: 8,
      behaviors: []
    };
    setObjects(prev => [...prev, newObj]);
    setActiveTool('select');
    handleSelect(newId);
  };

  const deleteObject = (id) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    setSelectedId(null);
  };

  const updateObject = useCallback((id, updates) => {
    setObjects(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)));
  }, []);

  const handleAddBehavior = useCallback((behavior) => {
    if (!selectedId) return;
    const currentBehaviors = selectedObj?.behaviors || [];
    updateObject(selectedId, { behaviors: [...currentBehaviors, behavior] });
  }, [selectedId, selectedObj, updateObject]);

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

  const handleAICommand = async (userInput) => {
    if (!userInput.trim()) return;
    setAiStatus('AI is processing your request...');
    setAiLoading(true);
    const historySeed = { input: userInput, timestamp: Date.now() };

    try {
      const response = await askAI(userInput, selectedId);
      if (!response.success) {
        const message = response.error || 'AI returned an error.';
        setAiStatus(message);
        appendHistory({ ...historySeed, status: 'error', message });
        return;
      }

      const action = response.action;
      const baseUpdate = { ...historySeed, op: action.op };
      console.log(action)

      switch (action.op) {
        case 'CREATE': {
          if (!action.data) {
            const message = 'AI did not return object data to create.';
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
            behaviors: action.data.behaviors || []
          };
          setObjects(prev => [...prev, newObj]);
          setSelectedId(newId);
          setAiStatus('AI created the object successfully.');
          appendHistory({ ...baseUpdate, status: 'success', message: `Created ${newObj.name}.` });
          break;
        }
        case 'MODIFY':
        case 'UPDATE': {
          const targetId = (action.ids && action.ids[0]) || action.data?.id || selectedId;
          if (!targetId) {
            const message = 'Please select an object before applying the change.';
            setAiStatus(message);
            appendHistory({ ...baseUpdate, status: 'error', message });
            break;
          }
          const properties = action.properties || action.data?.properties || action.data || {};
          if (Object.keys(properties).length === 0) {
            const message = 'AI did not provide any properties to update.';
            setAiStatus(message);
            appendHistory({ ...baseUpdate, status: 'error', message });
            break;
          }
          updateObject(targetId, properties);
          setAiStatus('AI updated the object.');
          appendHistory({ ...baseUpdate, status: 'success', message: `Updated ${targetId}.` });
          break;
        }
        case 'DELETE': {
          if (action.ids === 'all') {
            setObjects([]);
            setSelectedId(null);
            setAiStatus('AI cleared all objects.');
            appendHistory({ ...baseUpdate, status: 'success', message: 'Deleted all objects.' });
            break;
          }
          const idsToDelete = action.ids || (action.data?.ids ? action.data.ids : (action.data?.id ? [action.data.id] : []));
          if (!idsToDelete || idsToDelete.length === 0) {
            const message = 'No matching objects were found to delete.';
            setAiStatus(message);
            appendHistory({ ...baseUpdate, status: 'error', message });
            break;
          }
          idsToDelete.forEach(id => deleteObject(id));
          if (idsToDelete.includes(selectedId)) {
            setSelectedId(null);
          }
          setAiStatus('AI deleted the objects.');
          appendHistory({ ...baseUpdate, status: 'success', message: `Deleted ${idsToDelete.join(', ')}.` });
          break;
        }
        default: {
          const message = 'AI returned an unknown operation.';
          console.warn(message, action);
          setAiStatus(message);
          appendHistory({ ...baseUpdate, status: 'error', message });
        }
      }
    } catch (error) {
      const message = error?.message || 'AI processing failed.';
      console.error('AI execution failed', error);
      setAiStatus(message);
      appendHistory({ ...historySeed, status: 'error', message });
    } finally {
      setAiLoading(false);
      setInput('');
    }
  };

  const handleClearCanvas = () => {
    setObjects(INITIAL_OBJECTS);
    setSelectedId(INITIAL_OBJECTS[0]?.id ?? null);
  };

  const layoutProps = {
    objects,
    selectedId,
    selectedObj,
    mode,
    activeTool,
    setActiveTool,
    handleAddCustomObject,
    handleClearCanvas,
    handleSelect,
    updateObject,
    deleteObject,
    handleAddBehavior,
    canvasRef,
    triggerBehavior,
    setSelectedId
  };

  const containerStyle = isMobile ? styles.mobileContainer : styles.container;

  return (
    <View style={containerStyle}>
      <Header mode={mode} setMode={setMode} setActiveTool={setActiveTool} />

      {isMobile ? (
        <MobileWorkspace {...layoutProps} activeTab={activeTab} setActiveTab={setActiveTab} />
      ) : (
        <DesktopWorkspace {...layoutProps} />
      )}

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

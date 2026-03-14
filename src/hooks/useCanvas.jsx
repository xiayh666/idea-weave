import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { BTEngine } from '../core/BTEngine';
import { CanvasManager } from '../core/canvasManager';
import { CanvasManagerNative, MobileCanvas } from '../core/CanvasManagerNative';

export const useCanvas = (objects, setObjects, mode, setSelectedId) => {
  const managerRef = useRef(null);
  const canvasRef = useRef(null);
  const btEnginRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js';
      script.async = true;
      script.onload = () => {
        managerRef.current = new CanvasManager('fabric-canvas', {
          onSelect: (id) => setSelectedId(id),
          onModify: (id, updates) => {
            setObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
          },
          onAdd: (newObj) => setObjects(prev => [...prev, newObj]),
          onDelete: (id) => setObjects(prev => prev.filter(obj => obj.id !== id))
        });
        
        btEnginRef.current = new BTEngine(managerRef.current);
        btEnginRef.current.start();
        managerRef.current.renderAll()

        managerRef.current.syncState(objects, mode);
        setIsReady(true);
      };
      document.body.appendChild(script);

      return () => {
        if (managerRef.current) managerRef.current.destroy();
        script.remove();
      };
    } else {
      managerRef.current = new CanvasManagerNative(canvasRef, {
        onSelect: (id) => setSelectedId(id),
        onModify: (id, updates) => {
          setObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
        },
        onAdd: (newObj) => setObjects(prev => [...prev, newObj]),
        onDelete: (id) => setObjects(prev => prev.filter(obj => obj.id !== id))
      });
      setIsReady(true);

    }
  }, []);

  useEffect(() => {
  if (managerRef.current) {
    managerRef.current.syncState(objects, mode);
    console.log(objects)
    managerRef.current.renderAll() // 为什么这里不能用renderAll? 移除后无法正常渲染
  }
}, [objects, mode]);  // 移除了 isReady 依赖，移除了 renderAll() 调用

  return { manager: managerRef.current, canvasRef };
};

export function CanvasRenderer({ objects, mode, canvasRef, onSelect, onModify, onDelete }) {
  if (Platform.OS === 'web') {
    return <canvas id="fabric-canvas" width="800" height="600" />;
  } else {
    return <MobileCanvas objects={objects} mode={mode} canvasRef={canvasRef} onSelect={onSelect} onModify={onModify} onDelete={onDelete} />;
  }
}

import { useEffect, useRef, useState } from 'react';
import { CanvasManager } from '../core/CanvasManager';

export const useCanvas = (objects, setObjects, mode, setSelectedId) => {
  // 使用 useRef 保存类的实例，保证它在组件生命周期内存活
  const managerRef = useRef(null);
  const [isReady, setIsReady] = useState(false); // 标记 Fabric 是否加载完毕

  // 初始化脚本和类实例
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js';
    script.async = true;

    script.onload = () => {
      // CanvasManager，并传入回调函数
      managerRef.current = new CanvasManager('fabric-canvas', {
        onSelect: (id) => setSelectedId(id),
        onModify: (id, updates) => {
          setObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
        },
        onAdd: (newObj) => setObjects(prev => [...prev, newObj])

      });

      setIsReady(true);
    };

    document.body.appendChild(script);

    return () => {
      if (managerRef.current) managerRef.current.destroy();
      script.remove();
    };
  }, [])

  // 当 React 数据变化时，通知类更新
  useEffect(() => {
    if (isReady && managerRef.current) {
      managerRef.current.syncState(objects, mode);
      managerRef.current.renderAll();
    }
  }, [objects, mode, isReady]);

  return managerRef.current;
};
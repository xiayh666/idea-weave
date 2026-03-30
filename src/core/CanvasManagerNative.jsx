import { Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CANVAS_WIDTH = SCREEN_WIDTH - 40;
const CANVAS_HEIGHT = SCREEN_HEIGHT * 0.5;

export class CanvasManagerNative {
  constructor(svgRef, options = {}) {
    this.svgRef = svgRef;
    this.mode = 'edit';
    this.activeTool = 'select';
    this.objectsData = [];
    this.onSelect = options.onSelect || (() => {});
    this.onModify = options.onModify || (() => {});
    this.onAdd = options.onAdd || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.behaviorSyncListener = null;
    this.behaviorEngine = null;
    this.canvasObjects = new Map();
    this.canvas = {
      getObjects: () => this.getFabricObjects(),
      requestRenderAll: () => {},
      on: () => {},
      off: () => {},
      getActiveObject: () => null,
      discardActiveObject: () => {},
      remove: () => {},
      isDrawingMode: false,
      selection: false,
      defaultCursor: 'default',
    };
  }

  setTool(tool) {
    this.activeTool = tool;
  }

  syncState(objects, mode) {
    this.objectsData = objects;
    this.updateCanvasProxies(objects);
    if (this.mode !== mode) {
      this.mode = mode;
    }
    if (this.behaviorSyncListener) {
      this.behaviorSyncListener(objects);
    }
  }

  renderAll() {
    // 移动端不需要调用 onModify，避免无限循环
    // 渲染由 React 组件自动处理
  }

  setActiveObjectById(id) {
    console.log('setActiveObjectById:', id);
  }

  destroy() {
    this.canvasObjects.clear();
    this.behaviorEngine?.stop();
    this.svgRef = null;
  }

  registerBehaviorSyncListener(listener) {
    this.behaviorSyncListener = listener;
  }

  updateCanvasProxies(objects = []) {
    const ids = new Set(objects.map(o => o.id));
    for (const id of Array.from(this.canvasObjects.keys())) {
      if (!ids.has(id)) {
        this.canvasObjects.delete(id);
      }
    }
    objects.forEach(obj => {
      const proxy = this.canvasObjects.get(obj.id);
      if (proxy) {
        proxy.data = obj;
      }
    });
  }

  getFabricObjects() {
    return this.objectsData.map(obj => this.ensureProxyForObject(obj)).filter(Boolean);
  }

  ensureProxyForObject(obj) {
    if (!obj) return null;
    let proxy = this.canvasObjects.get(obj.id);
    if (!proxy) {
      proxy = new NativeFabricObject(obj, this);
      this.canvasObjects.set(obj.id, proxy);
    } else {
      proxy.data = obj;
    }
    return proxy;
  }

  setBehaviorEngine(engine) {
    this.behaviorEngine = engine;
  }

  emitTrigger(triggerName, targetId, extraEvent = {}) {
    if (!this.behaviorEngine || !targetId) return;
    const event = { target: { id: targetId, ...extraEvent } };
    this.behaviorEngine.handleTriggerEvent(triggerName, event);
  }
}

class NativeFabricObject {
  constructor(data, manager) {
    this.data = data;
    this.manager = manager;
    this.scaleX = data.scaleX ?? 1;
    this.scaleY = data.scaleY ?? 1;
    this.opacity = data.opacity ?? 1;
    this.angle = data.angle ?? 0;
  }

  get(key) {
    switch (key) {
      case 'left':
        return this.data.x;
      case 'top':
        return this.data.y;
      case 'width':
        return this.data.width;
      case 'height':
        return this.data.height;
      case 'scaleX':
        return this.scaleX;
      case 'scaleY':
        return this.scaleY;
      case 'opacity':
        return this.opacity;
      case 'angle':
        return this.angle;
      default:
        return this.data[key];
    }
  }

  set(props, value) {
    const updates = {};
    if (typeof props === 'string') {
      this.assignValue(props, value, updates);
    } else if (typeof props === 'object') {
      Object.entries(props).forEach(([key, val]) => this.assignValue(key, val, updates));
    }
    if (Object.keys(updates).length) {
      this.manager.onModify(this.data.id, updates);
    }
  }

  assignValue(key, value, updates) {
    switch (key) {
      case 'left':
        this.data.x = value;
        updates.x = value;
        break;
      case 'top':
        this.data.y = value;
        updates.y = value;
        break;
      case 'width':
        this.data.width = value;
        updates.width = value;
        break;
      case 'height':
        this.data.height = value;
        updates.height = value;
        break;
      case 'fill':
      case 'fillColor':
        this.data.fillColor = value;
        updates.fillColor = value;
        break;
      case 'opacity':
        this.opacity = value;
        this.data.opacity = value;
        updates.opacity = value;
        break;
      case 'scaleX':
        this.scaleX = value;
        updates.scaleX = value;
        break;
      case 'scaleY':
        this.scaleY = value;
        updates.scaleY = value;
        break;
      case 'angle':
        this.angle = value;
        updates.angle = value;
        break;
      default:
        this.data[key] = value;
        updates[key] = value;
        break;
    }
  }

  intersectsWithObject(other) {
    if (!other) return false;
    const left = this.get('left') ?? 0;
    const top = this.get('top') ?? 0;
    const width = this.get('width') ?? 0;
    const height = this.get('height') ?? 0;
    const oLeft = other.get('left') ?? 0;
    const oTop = other.get('top') ?? 0;
    const oWidth = other.get('width') ?? 0;
    const oHeight = other.get('height') ?? 0;
    return !(left + width < oLeft || left > oLeft + oWidth || top + height < oTop || top > oTop + oHeight);
  }
}

export function MobileCanvas({ objects, mode, canvasRef, onSelect, onModify, onDelete, onTrigger }) {
  const handleObjectPress = (id) => {
    if (mode === 'edit') {
      if (canvasRef?.current?.activeTool === 'erase') {
        // 姗＄毊鎿︽ā寮忥細鍒犻櫎鐗╀綋
        if (onDelete) {
          onDelete(id);
        }
      } else if (onSelect) {
        // 鍏朵粬妯″紡锛氶€変腑鐗╀綋
        onSelect(id);
      }
    }
    if (mode === 'edit' && onTrigger) {
      onTrigger(id, 'onClick');
    }
  };


  // 缩放比例，适配手机屏幕
  const scaleX = CANVAS_WIDTH / 300;
  const scaleY = CANVAS_HEIGHT / 400;
  const scale = Math.min(scaleX, scaleY);

  // 处理拖拽
    // 澶勭悊鎷栨嫿
  const handleDrag = (id, offsetX, offsetY) => {
    if (mode === 'edit' && onModify) {
      const scaledOffsetX = offsetX / scale;
      const scaledOffsetY = offsetY / scale;
      onModify(id, {
        x: objects.find(obj => obj.id === id).x + scaledOffsetX,
        y: objects.find(obj => obj.id === id).y + scaledOffsetY
      });
      onTrigger?.(id, 'onDrag', { dx: scaledOffsetX, dy: scaledOffsetY });
    }
  };


  // 为每个对象创建 PanResponder
  const createPanResponder = (id) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => mode === 'edit' && canvasRef?.current?.activeTool !== 'erase',
      onMoveShouldSetPanResponder: () => mode === 'edit' && canvasRef?.current?.activeTool !== 'erase',
      onPanResponderGrant: () => {
        // 开始拖拽时选中对象
        if (onSelect && canvasRef?.current?.activeTool !== 'erase') {
          onSelect(id);
        }
      },
      onPanResponderMove: (event, gestureState) => {
        handleDrag(id, gestureState.dx, gestureState.dy);
      },
      onPanResponderRelease: () => {
        // 拖拽结束
      }
    });
  };

  return (
    <View style={styles.container}>
      <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={styles.canvas} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
        {objects.map((obj) => {
          const scaledX = obj.x * scale;
          const scaledY = obj.y * scale;
          const scaledWidth = (obj.width || 50) * scale;
          const scaledHeight = (obj.height || 50) * scale;
          const scaledFontSize = (obj.fontSize || 16) * scale;
          
          // 创建拖拽响应器
          const panResponder = createPanResponder(obj.id);

          if (obj.type === 'rect') {
            return (
              <Rect
                key={obj.id}
                x={scaledX}
                y={scaledY}
                width={scaledWidth}
                height={scaledHeight}
                fill={obj.fillColor}
                rx={(obj.borderRadius || 0) * scale}
                ry={(obj.borderRadius || 0) * scale}
                onPress={() => handleObjectPress(obj.id)}
                {...panResponder.panHandlers}
              />
            );
          } else if (obj.type === 'circle') {
            return (
              <Circle
                key={obj.id}
                cx={scaledX + scaledWidth / 2}
                cy={scaledY + scaledHeight / 2}
                r={Math.min(scaledWidth, scaledHeight) / 2}
                fill={obj.fillColor}
                onPress={() => handleObjectPress(obj.id)}
                {...panResponder.panHandlers}
              />
            );
          } else if (obj.type === 'text') {
            return (
              <SvgText
                key={obj.id}
                x={scaledX}
                y={scaledY}
                fontSize={scaledFontSize}
                fill={obj.fillColor}
                onPress={() => handleObjectPress(obj.id)}
                {...panResponder.panHandlers}
              >
                {obj.text || ''}
              </SvgText>
            );
          } else if (obj.type === 'path' && obj.path) {
            const pathD = Array.isArray(obj.path) 
              ? obj.path.map(p => p.join(' ')).join(' ') 
              : obj.path;
            return (
              <Path
                key={obj.id}
                d={pathD}
                fill={obj.fillColor || 'transparent'}
                stroke={obj.stroke || '#000'}
                strokeWidth={(obj.strokeWidth || 2) * scale}
                onPress={() => handleObjectPress(obj.id)}
                {...panResponder.panHandlers}
              />
            );
          }
          return null;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    backgroundColor: 'white',
  },
});

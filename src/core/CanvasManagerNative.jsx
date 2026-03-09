import { Dimensions, StyleSheet, View } from 'react-native';
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
  }

  setTool(tool) {
    this.activeTool = tool;
  }

  syncState(objects, mode) {
    this.objectsData = objects;
    if (this.mode !== mode) {
      this.mode = mode;
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
    this.svgRef = null;
  }
}

export function MobileCanvas({ objects, mode, canvasRef, onSelect, onModify }) {
  const handleObjectPress = (id) => {
    if (onSelect) {
      onSelect(id);
    }
  };

  // 缩放比例，适配手机屏幕
  const scaleX = CANVAS_WIDTH / 300;
  const scaleY = CANVAS_HEIGHT / 400;
  const scale = Math.min(scaleX, scaleY);

  return (
    <View style={styles.container}>
      <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={styles.canvas} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
        {objects.map((obj) => {
          const scaledX = obj.x * scale;
          const scaledY = obj.y * scale;
          const scaledWidth = (obj.width || 50) * scale;
          const scaledHeight = (obj.height || 50) * scale;
          const scaledFontSize = (obj.fontSize || 16) * scale;

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
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    backgroundColor: 'white',
  },
});

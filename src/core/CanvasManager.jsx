export class CanvasManager {
  constructor(canvasId, options = {}) {
    this.canvas = new window.fabric.Canvas(canvasId, {
      width: 800,
      height: 600,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    this.mode = 'edit';
    this.currentTool = 'select';
    this.objectsData = [];

    this.onSelect = options.onSelect || (() => { });
    this.onModify = options.onModify || (() => { });
    this.onAdd = options.onAdd || (() => { });
    this.onDelete = options.onDelete || (() => { });
    
    // 碰撞检测相关
    this.collisionEnabled = true;
    this.collisionHandlers = new Map();

    this.bindCanvasEvents();
  }

  syncState(objects, mode) {
    this.objectsData = objects;

    // 如果模式发生了切换，更新画布上所有物体的交互状态
    if (this.mode !== mode) {
      this.mode = mode;
      this.updateAllObjectsInteractiveState();
    }
    
    // 每次状态更新都重新渲染画布
    this.renderAll();
  }

  // 重新渲染整个画布
  renderAll() {
    const isEditable = this.mode === 'edit';
    const currentCanvasObjects = this.canvas.getObjects();
    const dataIds = this.objectsData.map(o => o.id);

    // 删除阶段：画布上有，但 React 数据里没有的物体（比如被清空了）
    currentCanvasObjects.forEach(obj => {
      if (!dataIds.includes(obj.id)) {
        this.canvas.remove(obj);
      }
    });

    // 更新
    this.objectsData.forEach((objData) => {
      // 尝试在当前画布上找到同一个 ID 的物体
      let fObj = currentCanvasObjects.find(o => o.id === objData.id);

      // 提取通用的属性
      const commonProps = {
        left: objData.x,
        top: objData.y,
        fill: objData.fillColor,
        selectable: isEditable,
        hoverCursor: isEditable ? 'move' : 'pointer',
      };

      if (fObj) {
        fObj.set(commonProps);

        if (objData.type === 'rect') {
          fObj.set({
            width: objData.width,
            height: objData.height,
            rx: objData.borderRadius || 0,
            ry: objData.borderRadius || 0,
            scaleX: 1, scaleY: 1 // 重置缩放, 因为我们在 onModify 里已经把缩放值乘进 width 里了
          });
        } else if (objData.type === 'circle') {
          fObj.set({
            radius: (objData.width || 100) / 2,
            scaleX: 1, scaleY: 1
          });
        } else if (objData.type === 'text') {
          fObj.set({
            text: objData.text || '',
            fontSize: objData.fontSize || 20,
            scaleX: 1, scaleY: 1
          });

        }

      } else {
        // 如果物体不存在，才去真正地 Create
        if (objData.type === 'rect') {
          fObj = new window.fabric.Rect({
            ...commonProps, id: objData.id, width: objData.width, height: objData.height, rx: objData.borderRadius || 0, ry: objData.borderRadius || 0,
          });
        } else if (objData.type === 'circle') {
          fObj = new window.fabric.Circle({
            ...commonProps, id: objData.id, radius: (objData.width || 100) / 2,
          });
        } else if (objData.type === 'text') {
          fObj = new window.fabric.Text(objData.text || '', {
            ...commonProps, id: objData.id, fontSize: objData.fontSize || 20,
          });
        } else if (objData.type === 'path') {
          fObj = new window.fabric.Path(objData.path, {
            ...commonProps,
            id: objData.id,
            stroke: objData.stroke || '#1e293b',
            strokeWidth: objData.strokeWidth || 4,
            fill: 'transparent'
          });
        }


        if (fObj) {
          this.bindObjectBehaviors(fObj, objData);
          this.canvas.add(fObj);
        }
      }
    });

    // 最后统一渲染一次
    this.canvas.renderAll();
  }

  renderAll_() {
    this.canvas.clear();
    const isEditable = this.mode === 'edit';

    this.objectsData.forEach((objData) => {
      let fObj = null;
      const commonProps = {
        id: objData.id,
        left: objData.x,
        top: objData.y,
        fill: objData.fillColor,
        selectable: isEditable,
        hoverCursor: isEditable ? 'move' : 'pointer',
      };

      if (objData.type === 'rect') {
        fObj = new window.fabric.Rect({
          ...commonProps,
          width: objData.width,
          height: objData.height,
          rx: objData.borderRadius || 0,
          ry: objData.borderRadius || 0,
        });
      } else if (objData.type === 'circle') {
        fObj = new window.fabric.Circle({
          ...commonProps,
          radius: (objData.width || 100) / 2,
        });
      } else if (objData.type === 'text') {
        fObj = new window.fabric.Text(objData.text || '', {
          ...commonProps,
          fontSize: objData.fontSize || 20,
        });
      }

      if (fObj) {
        this.bindObjectBehaviors(fObj, objData);
        this.canvas.add(fObj);
      }
    });

    this.canvas.renderAll();
  }

  // 绑定单个物体的交互动画
  bindObjectBehaviors(fObj, objData) {
    fObj.on('mousedown', () => {
      if (this.mode !== 'play') return;

      const b = objData.behaviors?.[0];
      if (!b) return;

      const syncStateToReact = () => {
        fObj.setCoords(); // 更新物理包围盒

        this.onModify(objData.id, {
          x: fObj.left,
          y: fObj.top,
          width: fObj.width * fObj.scaleX,
          height: fObj.height * fObj.scaleY,
          angle: fObj.angle || 0
        });

        // 因为我们在上面把缩放值算进宽高里了，这里重置一下 Scale，防止下次渲染被成倍放大
        if (fObj.scaleX !== 1 || fObj.scaleY !== 1) {
          fObj.set({
            width: fObj.width * fObj.scaleX,
            height: fObj.height * fObj.scaleY,
            scaleX: 1,
            scaleY: 1
          });
        }
      };

      // 根据新的结构化behaviors执行动画
      const duration = (b.duration || 1) * 1000; // 转换为毫秒
      
      switch (b.action) {
        case 'rotate':
          const rotation = b.params?.rotation || 360;
          fObj.animate('angle', fObj.angle + rotation, {
            duration: duration,
            onChange: () => this.canvas.renderAll(),
            onComplete: syncStateToReact
          });
          break;
          
        case 'scale':
          const scale = b.params?.scale || 1.5;
          fObj.animate({ scaleX: scale, scaleY: scale }, {
            duration: duration,
            onChange: () => this.canvas.renderAll(),
            onComplete: syncStateToReact
          });
          break;
          
        case 'move':
          if (b.params?.moveTo) {
            fObj.animate('left', b.params.moveTo.x, {
              duration: duration,
              onChange: () => this.canvas.renderAll()
            });
            fObj.animate('top', b.params.moveTo.y, {
              duration: duration,
              onComplete: syncStateToReact
            });
          } else {
            // 随机移动作为默认值
            fObj.animate('left', 100 + Math.random() * 500, {
              duration: duration,
              onChange: () => this.canvas.renderAll()
            });
            fObj.animate('top', 100 + Math.random() * 300, {
              duration: duration,
              onComplete: syncStateToReact
            });
          }
          break;
          
        case 'fade':
          const opacity = b.params?.opacity || 0.5;
          fObj.animate('opacity', opacity, {
            duration: duration,
            onChange: () => this.canvas.renderAll(),
            onComplete: syncStateToReact
          });
          break;
          
        case 'modify':
          // 处理修改其他物体的行为
          if (b.targetId) {
            const targetObj = this.objectsData.find(o => o.id === b.targetId);
            if (targetObj) {
              // 找到目标物体的Fabric.js对象
              const fTargetObj = this.canvas.getObjects().find(f => f.id === b.targetId);
              if (fTargetObj) {
                // 应用修改
                const properties = {};
                if (b.params?.color) {
                  properties.fill = b.params.color;
                }
                if (b.params?.position) {
                  properties.left = b.params.position.x;
                  properties.top = b.params.position.y;
                }
                if (b.params?.size) {
                  properties.width = b.params.size.width;
                  properties.height = b.params.size.height;
                }
                if (b.params?.text) {
                  properties.text = b.params.text;
                }
                if (b.params?.fontSize) {
                  properties.fontSize = b.params.fontSize;
                }
                
                // 应用修改并同步状态
                fTargetObj.set(properties);
                this.canvas.renderAll();
                
                // 同步到React状态
                if (this.onModify) {
                  this.onModify(b.targetId, {
                    ...targetObj,
                    ...properties,
                    x: fTargetObj.left,
                    y: fTargetObj.top,
                    width: fTargetObj.width,
                    height: fTargetObj.height
                  });
                }
              }
            }
          }
          break;
          
        default:
          // 兼容旧的行为格式
          if (b.name?.includes('旋转')) {
            fObj.animate('angle', fObj.angle + 360, {
              duration: 1000,
              onChange: () => this.canvas.renderAll(),
              onComplete: syncStateToReact
            });
          } else if (b.name?.includes('变大')) {
            fObj.animate({ scaleX: 1.5, scaleY: 1.5 }, {
              duration: 600,
              onChange: () => this.canvas.renderAll(),
              onComplete: syncStateToReact
            });
          } else if (b.name?.includes('移动')) {
            fObj.animate('left', 100 + Math.random() * 500, {
              duration: 800,
              onChange: () => this.canvas.renderAll()
            });
            fObj.animate('top', 100 + Math.random() * 300, {
              duration: 800,
              onComplete: syncStateToReact
            });
          }
      }
    });
  }
  // 切换工具栏
  setTool(tool) {
    this.currentTool = tool;

    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'default';

    const isEditable = this.mode === 'edit';

    // 根据不同工具配置画布
    switch (tool) {
      case 'select':
        this.canvas.selection = isEditable;
        this.canvas.defaultCursor = 'default';
        this.updateAllObjectsInteractiveState(true); // 允许选中物体
        break;

      case 'pan':
        this.canvas.defaultCursor = 'grab';
        this.updateAllObjectsInteractiveState(false); // 禁止选中物体
        break;

      case 'draw':
        this.canvas.isDrawingMode = true;
        this.canvas.freeDrawingBrush.color = '#1e293b';
        this.canvas.freeDrawingBrush.width = 4;
        this.updateAllObjectsInteractiveState(false);
        break;

      case 'erase':
        this.canvas.defaultCursor = 'crosshair';
        this.canvas.selection = false;
        this.updateAllObjectsInteractiveState(true, true); // 允许点击物体来删除
        break;
    }
  }

  // 修改原来的 updateAllObjectsInteractiveState 方法，加一个参数
  updateAllObjectsInteractiveState(allowSelect = true, isEraseMode = false) {
    const isEditable = this.mode === 'edit';
    const selectable = isEditable && allowSelect; // 必须是编辑模式且当前工具允许选中

    this.canvas.getObjects().forEach(obj => {
      obj.set({
        selectable: selectable,
        evented: true,
        hoverCursor: isEraseMode ? 'crosshair' : (selectable ? 'move' : 'default')
      });
      if (!selectable) this.canvas.discardActiveObject();
    });
    this.canvas.renderAll();
  }

  // 更新可交互状态
  updateAllObjectsInteractiveState() {
    const isEditable = this.mode === 'edit';
    this.canvas.getObjects().forEach(obj => {
      obj.set({
        selectable: isEditable,
        evented: true,
        hoverCursor: isEditable ? 'move' : 'pointer'
      });
      if (!isEditable) this.canvas.discardActiveObject();
    });
    this.canvas.renderAll();
  }

  // 绑定画布事件
  bindCanvasEvents() {
    this.canvas.on('selection:created', (e) => {
      if (this.currentTool === 'erase') {
        const target = e.selected[0];
        if (target && target.id) {
          this.canvas.remove(target);
          this.canvas.discardActiveObject();
          this.onDelete(target.id);
        }
      } else {
        e.selected[0] && this.onSelect(e.selected[0].id);
      }
    });
    
    this.canvas.on('selection:updated', (e) => {
      if (this.currentTool === 'erase') {
        const target = e.selected[0];
        if (target && target.id) {
          this.canvas.remove(target);
          this.canvas.discardActiveObject();
          this.onDelete(target.id);
        }
      } else {
        e.selected[0] && this.onSelect(e.selected[0].id);
      }
    });
    
    this.canvas.on('selection:cleared', () => {
      if (this.currentTool !== 'erase') {
        this.onSelect(null);
      }
    });

    this.canvas.on('object:modified', (e) => {
      const target = e.target;
      if (!target || !target.id) return;
      this.onModify(target.id, {
        x: target.left,
        y: target.top,
        width: target.width * target.scaleX,
        height: target.height * target.scaleY,
      });
    });
    this.canvas.on('path:created', (e) => {
      const path = e.path; // 获取刚刚画完的路径对象

      const newId = `path-${Date.now()}`;
      path.id = newId;

      const pathData = {
        id: newId,
        name: 'Path',
        type: 'path', // 标记类型为笔迹
        path: path.path, // 笔迹的路径数组
        x: path.left,
        y: path.top,
        width: path.width,
        height: path.height,
        fillColor: 'transparent',
        stroke: path.stroke, // 画笔颜色
        strokeWidth: path.strokeWidth, // 画笔粗细
        behaviors: []
      };

      // 调用外部传入的 onAdd 方法，把笔迹塞进 React 的 objects 数组
      if (this.onAdd) {
        this.onAdd(pathData);
      }
    });
    
    // 移动事件 - 用于碰撞检测
    this.canvas.on('object:moving', (e) => {
      if (this.mode === 'play' && this.collisionEnabled) {
        this.checkCollisions(e.target);
      }
    });

    // 缩放事件 - 用于碰撞检测
    this.canvas.on('object:scaling', (e) => {
      if (this.mode === 'play' && this.collisionEnabled) {
        this.checkCollisions(e.target);
      }
    });
  }

  // 选中某个物体
  setActiveObjectById(id) {
    this.canvas.discardActiveObject();
    const target = this.canvas.getObjects().find(o => o.id === id);
    if (target) {
      this.canvas.setActiveObject(target);
      this.canvas.renderAll();
    }
  }

  destroy() {
    this.canvas.dispose();
  }

  // 检查碰撞
  checkCollisions(movingObj) {
    if (!movingObj || !movingObj.id) return;
    
    const otherObjects = this.canvas.getObjects().filter(obj => obj.id !== movingObj.id);
    
    otherObjects.forEach(otherObj => {
      if (otherObj.id && this.isColliding(movingObj, otherObj)) {
        this.handleCollision(movingObj, otherObj);
      }
    });
  }

  // 检测两个物体是否碰撞
  isColliding(obj1, obj2) {
    obj1.setCoords();
    obj2.setCoords();
    return obj1.intersectsWithObject(obj2);
  }

  // 处理碰撞事件
  handleCollision(obj1, obj2) {
    const collisionKey = `${obj1.id}-${obj2.id}`;
    
    // 检查是否已经处理过这个碰撞对，避免重复触发
    if (!this.collisionHandlers.has(collisionKey)) {
      // 标记为已处理
      this.collisionHandlers.set(collisionKey, true);
      
      // 300毫秒后清除标记，允许再次触发
      setTimeout(() => {
        this.collisionHandlers.delete(collisionKey);
      }, 300);
      
      // 查找obj1的行为配置
      const obj1Data = this.objectsData.find(o => o.id === obj1.id);
      if (obj1Data && obj1Data.behaviors) {
        obj1Data.behaviors.forEach(behavior => {
          if (behavior.action === 'collision' && behavior.targetId === obj2.id) {
            // 执行碰撞行为
            this.executeCollisionBehavior(behavior, obj1, obj2);
          }
        });
      }
      
      // 查找obj2的行为配置
      const obj2Data = this.objectsData.find(o => o.id === obj2.id);
      if (obj2Data && obj2Data.behaviors) {
        obj2Data.behaviors.forEach(behavior => {
          if (behavior.action === 'collision' && behavior.targetId === obj1.id) {
            // 执行碰撞行为
            this.executeCollisionBehavior(behavior, obj2, obj1);
          }
        });
      }
    }
  }

  // 执行碰撞行为
  executeCollisionBehavior(behavior, sourceObj, targetObj) {
    if (behavior.params) {
      // 应用修改到目标物体
      const properties = {};
      if (behavior.params.color) {
        targetObj.set('fill', behavior.params.color);
        properties.fill = behavior.params.color;
      }
      if (behavior.params.opacity) {
        targetObj.set('opacity', behavior.params.opacity);
        properties.opacity = behavior.params.opacity;
      }
      if (behavior.params.scale) {
        targetObj.set('scaleX', behavior.params.scale);
        targetObj.set('scaleY', behavior.params.scale);
        properties.scaleX = behavior.params.scale;
        properties.scaleY = behavior.params.scale;
      }
      
      // 渲染画布
      this.canvas.renderAll();
      
      // 同步到React状态
      if (this.onModify && targetObj.id) {
        const targetData = this.objectsData.find(o => o.id === targetObj.id);
        if (targetData) {
          this.onModify(targetObj.id, {
            ...targetData,
            ...properties,
            x: targetObj.left,
            y: targetObj.top,
            width: targetObj.width * targetObj.scaleX,
            height: targetObj.height * targetObj.scaleY
          });
        }
      }
    }
  }
}

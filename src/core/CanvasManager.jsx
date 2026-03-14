
export class CanvasManager {
  constructor(canvasId, options = {}) {
    // 1. 初始化 Fabric 画布
    this.canvas = new window.fabric.Canvas(canvasId, {
      width: 800,
      height: 600,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    // 2. 内部状态
    this.mode = 'edit';
    this.currentTool = 'select'; // 保留工具状态
    this.objectsData = [];

    // 3. 向上层 (React) 汇报的回调函数
    this.onSelect = options.onSelect || (() => { });
    this.onModify = options.onModify || (() => { });
    this.onAdd = options.onAdd || (() => { });
    this.onDelete = options.onDelete || (() => { });

    // (已删除：collisionEnabled 和 collisionHandlers)

    // 4. 绑定基础原生事件
    this.bindCanvasEvents();
  }

  // ==========================================
  // 【一、 生命周期与状态同步】 (React -> Canvas)
  // ==========================================

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

  // 重新渲染整个画布 (保留了你极其优秀的 Diff 算法和完整图形支持)
  renderAll() {
    const isEditable = this.mode === 'edit';
    const currentCanvasObjects = this.canvas.getObjects();
    const dataIds = this.objectsData.map(o => o.id);

    // 1. 删除阶段：画布上有，但 React 数据里没有的物体
    currentCanvasObjects.forEach(obj => {
      if (!dataIds.includes(obj.id)) {
        this.canvas.remove(obj);
      }
    });

    // 2. 更新/新增阶段
    this.objectsData.forEach((objData) => {
      let fObj = currentCanvasObjects.find(o => o.id === objData.id);

      const commonProps = {
        left: objData.x,
        top: objData.y,
        fill: objData.fillColor || 'transparent',
        // selectable: isEditable && (this.currentTool === 'select' || this.currentTool === 'erase'),
        selectable: true,
        hoverCursor: isEditable && this.currentTool === 'select' ? 'move' : 'default',
        hasControls: isEditable, // 只有编辑模式显示缩放旋转手柄
        hasBorders: isEditable,  // 只有编辑模式显示边框
        lockMovementX: false,    // 允许移动
        lockMovementY: false,
      };

      if (fObj) {
        // 更新现有物体
        fObj.set(commonProps);

        if (objData.type === 'rect') {
          fObj.set({
            width: objData.width, height: objData.height,
            rx: objData.borderRadius || 0, ry: objData.borderRadius || 0,
            scaleX: 1, scaleY: 1
          });
        } else if (objData.type === 'circle') {
          fObj.set({
            radius: (objData.width || 100) / 2,
            scaleX: 1, scaleY: 1
          });
        } else if (objData.type === 'text') {
          fObj.set({
            text: objData.text || '', fontSize: objData.fontSize || 20,
            scaleX: 1, scaleY: 1
          });
        }
        // path 的更新不需要额外处理专属属性，commonProps 足够
      } else {
        // 创建新物体
        if (objData.type === 'rect') {
          fObj = new window.fabric.Rect({
            ...commonProps, id: objData.id, width: objData.width, height: objData.height,
            rx: objData.borderRadius || 0, ry: objData.borderRadius || 0,
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
            ...commonProps, id: objData.id,
            stroke: objData.stroke || '#1e293b', strokeWidth: objData.strokeWidth || 4,
            fill: 'transparent'
          });
        }

        if (fObj) {
          this.canvas.add(fObj);
        }
      }
    });

    this.canvas.renderAll();
  }

  // ==========================================
  // 【二、 画板编辑工具栏相关逻辑】 (保留并合并)
  // ==========================================

  // 切换工具栏
  setTool(tool) {
    this.currentTool = tool;
    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;
    this.canvas.defaultCursor = 'default';

    const isEditable = this.mode === 'edit';

    this.canvas.discardActiveObject();

    switch (tool) {
      case 'select':
        this.canvas.selection = isEditable;
        this.canvas.defaultCursor = 'default';
        this.updateAllObjectsInteractiveState(true);
        break;
      case 'pan':
        this.canvas.defaultCursor = 'grab';
        this.updateAllObjectsInteractiveState(false);
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
        this.updateAllObjectsInteractiveState(true, true);
        break;
    }
  }

  // 更新所有物体的交互状态 (合并了两个重名的函数)
  updateAllObjectsInteractiveState(allowSelect = true, isEraseMode = false) {
    const isEditable = this.mode === 'edit';
    const selectable = isEditable && allowSelect;

    this.canvas.getObjects().forEach(obj => {
      obj.set({
        selectable: selectable,
        evented: true,
        hoverCursor: isEraseMode ? 'crosshair' : (selectable ? 'move' : 'default')
      });
      if (!selectable) this.canvas.discardActiveObject();
    });
    this.canvas.requestRenderAll();
  }

  // 选中某个物体
  setActiveObjectById(id) {
    this.canvas.discardActiveObject();
    const target = this.canvas.getObjects().find(o => o.id === id);
    if (target) {
      this.canvas.setActiveObject(target);
      this.canvas.requestRenderAll();
    }
  }

  // ==========================================
  // 【三、 画布原生事件绑定】 (保留了绘图、擦除等逻辑)
  // ==========================================

  bindCanvasEvents() {
    // 处理选中与橡皮擦逻辑
    const handleSelection = (e) => {
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
    };

    this.canvas.on('selection:created', handleSelection);
    this.canvas.on('selection:updated', handleSelection);

    this.canvas.on('selection:cleared', () => {
      if (this.currentTool !== 'erase') {
        this.onSelect(null);
      }
    });

    // 处理用户拖拽、缩放物体结束
    this.canvas.on('object:modified', (e) => {
      const target = e.target;
      if (!target || !target.id) return;
      this.onModify(target.id, {
        x: target.left,
        y: target.top,
        width: target.width * target.scaleX,
        height: target.height * target.scaleY,
        angle: target.angle || 0
      });
    });

    // 处理画笔绘制结束
    this.canvas.on('path:created', (e) => {
      const path = e.path;
      const newId = `path-${Date.now()}`;
      path.id = newId;

      const pathData = {
        id: newId,
        name: 'Path',
        type: 'path',
        path: path.path,
        x: path.left,
        y: path.top,
        width: path.width,
        height: path.height,
        fillColor: 'transparent',
        stroke: path.stroke,
        strokeWidth: path.strokeWidth,
        behaviors: [] // 笔迹默认不带行为，但可以后期添加
      };

      if (this.onAdd) this.onAdd(pathData);
    });
  }

  // ==========================================
  // 【四、 暴露给 BTEngine 的引擎 API】 (新增的精简接口)
  // ==========================================

  getObjectById(id) {
    return this.canvas.getObjects().find(o => o.id === id);
  }

  modifyObject(id, properties) {
    const targetObj = this.getObjectById(id);
    if (!targetObj) return;

    targetObj.set(properties);
    this.canvas.requestRenderAll();

    const updateData = { ...properties };
    if (properties.left !== undefined) updateData.x = targetObj.left;
    if (properties.top !== undefined) updateData.y = targetObj.top;

    this.onModify(id, updateData);
  }

  animateObject(id, property, targetValue, duration = 1000) {
    const targetObj = this.getObjectById(id);
    if (!targetObj) return Promise.resolve();

    return new Promise((resolve) => {
      targetObj.animate(property, targetValue, {
        duration: duration,
        easing: window.fabric.util.ease.easeInOutQuad,
        onChange: () => this.canvas.requestRenderAll(),
        onComplete: () => {
          this.modifyObject(id, { [property]: targetValue });
          resolve();
        }
      });
    });
  }

  // ==========================================
  // 【五、 销毁】
  // ==========================================

  destroy() {
    this.canvas.dispose();
  }
}
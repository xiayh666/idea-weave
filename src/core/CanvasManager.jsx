export class CanvasManager {
  constructor(canvasId, options = {}) {
    this.canvas = new window.fabric.Canvas(canvasId, {
      width: 800,
      height: 600,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    });

    this.mode = 'edit';
    this.objectsData = [];

    this.onSelect = options.onSelect || (() => { });
    this.onModify = options.onModify || (() => { });
    this.onAdd = options.onAdd || (() => { });
    console.log(this.onAdd);
    

    this.bindCanvasEvents();
  }

  syncState(objects, mode) {
    this.objectsData = objects;

    // 如果模式发生了切换，更新画布上所有物体的交互状态
    if (this.mode !== mode) {
      this.mode = mode;
      this.updateAllObjectsInteractiveState();
    }
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



      /**
       * 
       * 待修改，此处为AI指令解析部分
       * 
       */



      if (b.name.includes('旋转')) {
        fObj.animate('angle', fObj.angle + 360, {
          duration: 1000,
          onChange: () => this.canvas.renderAll(),
          onComplete: syncStateToReact // ✨ 动画结束，同步状态
        });
      } else if (b.name.includes('变大')) {
        fObj.animate({ scaleX: 1.5, scaleY: 1.5 }, {
          duration: 600,
          onChange: () => this.canvas.renderAll(),
          onComplete: syncStateToReact // ✨ 动画结束，同步状态
        });
      } else if (b.name.includes('移动')) {
        fObj.animate('left', 100 + Math.random() * 500, {
          duration: 800,
          onChange: () => this.canvas.renderAll()
        });
        fObj.animate('top', 100 + Math.random() * 300, {
          duration: 800,
          onComplete: syncStateToReact // ✨ 动画结束，同步状态
        });
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
        this.updateAllObjectsInteractiveState(true); // 允许点击物体来删除
        break;
    }
  }

  // 修改原来的 updateAllObjectsInteractiveState 方法，加一个参数
  updateAllObjectsInteractiveState(allowSelect = true) {
    const isEditable = this.mode === 'edit';
    const selectable = isEditable && allowSelect; // 必须是编辑模式且当前工具允许选中

    this.canvas.getObjects().forEach(obj => {
      obj.set({
        selectable: selectable,
        evented: true,
        hoverCursor: selectable ? 'move' : 'default'
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
    this.canvas.on('selection:created', (e) => e.selected[0] && this.onSelect(e.selected[0].id));
    this.canvas.on('selection:updated', (e) => e.selected[0] && this.onSelect(e.selected[0].id));
    this.canvas.on('selection:cleared', () => this.onSelect(null));

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
}
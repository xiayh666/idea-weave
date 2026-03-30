import utils from "../utils/utils";

const clampValue = (value, min, max) => Math.max(min, Math.min(max, value));

export const BTStatus = {
  SUCCESS: 1,
  FAILURE: 2,
  RUNNING: 3,
};

export class BTNode {
  tick(context) {
    throw new Error("必须在子类重写 tick 方法");
  }
  reset() {}
}

export class SequenceNode extends BTNode {
  constructor(children = []) {
    super();
    this.children = children;
    this.currentIndex = 0;
  }

  tick(context) {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(context);
      if (status === BTStatus.RUNNING) return BTStatus.RUNNING;
      if (status === BTStatus.FAILURE) {
        this.reset();
        return BTStatus.FAILURE;
      }
      this.currentIndex++;
    }
    this.reset();
    return BTStatus.SUCCESS;
  }

  reset() {
    this.currentIndex = 0;
    this.children.forEach(child => child.reset());
  }
}

export class SelectorNode extends BTNode {
  constructor(children = []) {
    super();
    this.children = children;
    this.currentIndex = 0;
  }

  tick(context) {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick(context);
      if (status === BTStatus.RUNNING) return BTStatus.RUNNING;
      if (status === BTStatus.SUCCESS) {
        this.reset();
        return BTStatus.SUCCESS;
      }
      this.currentIndex++;
    }
    this.reset();
    return BTStatus.FAILURE;
  }

  reset() {
    this.currentIndex = 0;
    this.children.forEach(child => child.reset());
  }
}

export class ParallelNode extends BTNode {
  constructor(children = []) {
    super();
    this.children = children;
    this.statuses = new Array(children.length).fill(null);
  }

  tick(context) {
    let anyRunning = false;
    for (let i = 0; i < this.children.length; i++) {
      const status = this.children[i].tick(context);
      this.statuses[i] = status;
      if (status === BTStatus.FAILURE) {
        this.reset();
        return BTStatus.FAILURE;
      }
      if (status === BTStatus.RUNNING) anyRunning = true;
    }
    if (anyRunning) return BTStatus.RUNNING;
    this.reset();
    return BTStatus.SUCCESS;
  }

  reset() {
    this.statuses.fill(null);
    this.children.forEach(child => child.reset());
  }
}

export class RepeatNode extends BTNode {
  constructor(child, count = 1, delay = 0) {
    super();
    this.child = child;
    this.count = count;
    this.delay = delay;
    this.completed = 0;
    this.waitUntil = 0;
  }

  tick(context) {
    if (!this.child) return BTStatus.FAILURE;
    if (this.count !== Infinity && this.completed >= this.count) {
      this.reset();
      return BTStatus.SUCCESS;
    }
    if (this.delay > 0 && Date.now() < this.waitUntil) {
      return BTStatus.RUNNING;
    }
    const status = this.child.tick(context);
    if (status === BTStatus.RUNNING) return BTStatus.RUNNING;
    if (status === BTStatus.FAILURE) {
      this.reset();
      return BTStatus.FAILURE;
    }
    this.completed += 1;
    this.child.reset();
    this.waitUntil = this.delay > 0 ? Date.now() + this.delay : 0;
    if (this.count === Infinity) {
      return BTStatus.RUNNING;
    }
    if (this.completed >= this.count) {
      this.reset();
      return BTStatus.SUCCESS;
    }
    return BTStatus.RUNNING;
  }

  reset() {
    this.completed = 0;
    this.waitUntil = 0;
    if (this.child) this.child.reset();
  }
}

export class ForeachNode extends BTNode {
  constructor(child, items = [], delay = 0) {
    super();
    this.child = child;
    this.items = items;
    this.currentIndex = 0;
    this.delay = delay;
    this.waitUntil = 0;
  }

  tick(context) {
    if (!this.child) return BTStatus.FAILURE;
    if (this.currentIndex >= this.items.length) {
      this.reset();
      return BTStatus.SUCCESS;
    }
    if (this.delay > 0 && Date.now() < this.waitUntil) {
      return BTStatus.RUNNING;
    }
    const targetId = this.items[this.currentIndex];
    const canvas = context.canvasManager.canvas;
    const iterationTarget = canvas?.getObjects().find(o => o.id === targetId);
    const childContext = {
      ...context,
      targetObj: iterationTarget || context.targetObj,
      iterationTargetId: targetId
    };
    const status = this.child.tick(childContext);
    if (status === BTStatus.RUNNING) return BTStatus.RUNNING;
    if (status === BTStatus.FAILURE) {
      this.reset();
      return BTStatus.FAILURE;
    }
    this.currentIndex += 1;
    this.child.reset();
    this.waitUntil = this.delay > 0 ? Date.now() + this.delay : 0;
    if (this.currentIndex >= this.items.length) {
      this.reset();
      return BTStatus.SUCCESS;
    }
    return BTStatus.RUNNING;
  }

  reset() {
    this.currentIndex = 0;
    this.waitUntil = 0;
    if (this.child) this.child.reset();
  }
}

export class ActionNode extends BTNode {
  constructor(actionName, params, duration = 0) {
    super();
    this.actionName = actionName;
    this.params = params || {};
    this.duration = duration;
    this.startTime = null;
  }

  static syncObjectState(canvasManager, targetObj, { includeScale = false } = {}) {
    if (!canvasManager?.onModify || !targetObj?.id) return;
    const getValue = (prop) => {
      if (typeof targetObj.get === 'function') {
        return targetObj.get(prop);
      }
      return targetObj[prop];
    };

    const payload = {};
    const left = getValue('left');
    const top = getValue('top');
    const angle = getValue('angle');
    const fill = getValue('fill');
    const opacity = getValue('opacity');
    if (typeof left === 'number') payload.x = left;
    if (typeof top === 'number') payload.y = top;
    if (typeof angle === 'number') payload.angle = angle;
    if (typeof fill === 'string') payload.fillColor = fill;
    if (typeof opacity === 'number') payload.opacity = opacity;
    if (includeScale) {
      const scaleX = getValue('scaleX');
      const scaleY = getValue('scaleY');
      if (typeof scaleX === 'number') payload.scaleX = scaleX;
      if (typeof scaleY === 'number') payload.scaleY = scaleY;
    }

    if (Object.keys(payload).length === 0) return;
    canvasManager.onModify(targetObj.id, payload);
  }

  resolveTarget(context) {
    const canvas = context.canvasManager.canvas;
    const explicitId = this.params.targetId || context.iterationTargetId || context.behaviorTargetId;
    if (explicitId) {
      const explicitObj = canvas?.getObjects().find(o => o.id === explicitId);
      if (explicitObj) return explicitObj;
    }
    if (context.targetObj) return context.targetObj;
    return null;
  }

  tick(context) {
    const { canvasManager } = context;
    const targetObj = this.resolveTarget(context);
    if (!targetObj) return BTStatus.FAILURE;
    if (!this.duration || this.duration <= 0) {
      switch (this.actionName) {
        case 'modify':
          if (this.params.color) targetObj.set('fill', this.params.color);
          if (this.params.opacity !== undefined) targetObj.set('opacity', this.params.opacity);
          if (this.params.text) targetObj.set('text', this.params.text);
          break;
        case 'move':
          if (this.params.moveTo) {
            targetObj.set({ left: this.params.moveTo.x, top: this.params.moveTo.y });
          } else {
            const newLeft = (targetObj.left || 0) + (this.params.dx || 0);
            const newTop = (targetObj.top || 0) + (this.params.dy || 0);
            targetObj.set({ left: newLeft, top: newTop });
          }
          break;
        case 'scale':
          targetObj.set({ scaleX: this.params.scaleX ?? targetObj.scaleX ?? 1, scaleY: this.params.scaleY ?? targetObj.scaleY ?? 1 });
          break;
        case 'rotate':
          targetObj.set('angle', this.params.angle ?? targetObj.angle ?? 0);
          break;
        case 'launch': {
          const canvas = canvasManager.canvas;
          const stageWidth = (canvas?.getWidth?.() ?? canvas?.width) ?? 800;
          const stageHeight = (canvas?.getHeight?.() ?? canvas?.height) ?? 600;
          const emitterObj = context.iterationTargetId ? canvas?.getObjects().find(o => o.id === context.iterationTargetId) : targetObj;
          const target = targetObj || emitterObj;
          if (!target) return BTStatus.FAILURE;
          target.setCoords();
          const dx = this.params.dx ?? this.params.forceX ?? 0;
          const dy = this.params.dy ?? this.params.forceY ?? -220;
          const targetLeft = (target.left ?? 0) + dx;
          const targetTop = (target.top ?? 0) + dy;
          const targetWidth = (target.width ?? 0) * (target.scaleX ?? 1);
          const targetHeight = (target.height ?? 0) * (target.scaleY ?? 1);
          const finalLeft = clampValue(targetLeft, 0, Math.max(0, stageWidth - targetWidth));
          const finalTop = clampValue(targetTop, 0, Math.max(0, stageHeight - targetHeight));
          const duration = Math.max(50, this.params.duration ?? 500);
          const spinAmt = this.params.spin ?? 0;
          const animations = [
            canvasManager.animateObject(target.id, 'left', finalLeft, duration),
            canvasManager.animateObject(target.id, 'top', finalTop, duration)
          ];
          if (this.params.addSpin) {
            animations.push(canvasManager.animateObject(target.id, 'angle', (target.angle ?? 0) + spinAmt, duration));
          }
          Promise.all(animations).catch(() => {});
          return BTStatus.SUCCESS;
        }
        case 'colorInside': {
          const emitterObj = targetObj;
          emitterObj?.setCoords();
          const canvas = canvasManager.canvas;
          const color = this.params.color || '#dc2626';
          const allowIds = Array.isArray(this.params.targetIds) ? new Set(this.params.targetIds) : null;
          canvas?.getObjects().forEach(obj => {
            if (!obj || obj.id === emitterObj.id || (allowIds && !allowIds.has(obj.id))) return;
            obj.setCoords();
            if (emitterObj.intersectsWithObject(obj)) {
              canvasManager.modifyObject(obj.id, { fillColor: color });
            }
          });
          return BTStatus.SUCCESS;
        }
        default:
          break;
      }
      canvasManager.canvas.requestRenderAll();
      ActionNode.syncObjectState(canvasManager, targetObj, { includeScale: this.actionName === 'scale' });
      return BTStatus.SUCCESS;
    }
    if (!this.startTime) {
      this.startTime = Date.now();
      this.startState = {
        opacity: targetObj.get('opacity') ?? 1,
        left: targetObj.get('left') ?? 0,
        top: targetObj.get('top') ?? 0,
        scaleX: targetObj.get('scaleX') ?? 1,
        scaleY: targetObj.get('scaleY') ?? 1,
        angle: targetObj.get('angle') ?? 0
      };
    }
    const elapsed = Date.now() - this.startTime;
    const linearProgress = Math.min(elapsed / this.duration, 1);
    const easingType = (this.params && this.params.easing) ? this.params.easing : 'easeOutCubic';
    const easeFn = utils.easing[easingType] || utils.easing.linear;
    const progress = easeFn(linearProgress);
    switch (this.actionName) {
      case 'fade': {
        const targetOpacity = this.params.opacity ?? 1;
        targetObj.set('opacity', this.startState.opacity + (targetOpacity - this.startState.opacity) * progress);
        break;
      }
      case 'move': {
        if (this.params.moveTo) {
          targetObj.set({
            left: this.startState.left + (this.params.moveTo.x - this.startState.left) * progress,
            top: this.startState.top + (this.params.moveTo.y - this.startState.top) * progress
          });
        } else {
          const dx = this.params.dx || 0;
          const dy = this.params.dy || 0;
          targetObj.set({ left: this.startState.left + dx * progress, top: this.startState.top + dy * progress });
        }
        break;
      }
      case 'scale': {
        const targetScaleX = this.params.scaleX ?? this.startState.scaleX;
        const targetScaleY = this.params.scaleY ?? this.startState.scaleY;
        targetObj.set({
          scaleX: this.startState.scaleX + (targetScaleX - this.startState.scaleX) * progress,
          scaleY: this.startState.scaleY + (targetScaleY - this.startState.scaleY) * progress
        });
        break;
      }
      case 'rotate': {
        const dAngle = this.params.angle || 0;
        targetObj.set('angle', this.startState.angle + dAngle * progress);
        break;
      }
      case 'wait':
        break;
      default:
        break;
    }
    if (this.actionName !== 'wait') {
      canvasManager.canvas.requestRenderAll();
    }
    if (linearProgress >= 1) {
      this.startTime = null;
      this.startState = null;
      ActionNode.syncObjectState(canvasManager, targetObj, { includeScale: this.actionName === 'scale' });
      return BTStatus.SUCCESS;
    }
    return BTStatus.RUNNING;
  }

  reset() {
    this.startTime = null;
  }
}

export class InsideNode extends BTNode {
  constructor(child, params = {}) {
    super();
    this.child = child;
    this.params = params;
    this.targets = [];
    this.currentIndex = 0;
  }

  gatherTargets(context) {
    const canvas = context.canvasManager.canvas;
    const emitter = context.targetObj;
    if (!canvas || !emitter) return [];
    emitter.setCoords();
    const filterIds = Array.isArray(this.params.targetIds) ? new Set(this.params.targetIds) : null;
    return (canvas.getObjects() || [])
      .filter(obj => obj && obj.id && obj.id !== emitter.id && (!filterIds || filterIds.has(obj.id)))
      .filter(obj => {
        obj.setCoords();
        return emitter.intersectsWithObject(obj);
      })
      .map(obj => obj.id);
  }

  tick(context) {
    if (!this.child) {
      return BTStatus.SUCCESS;
    }
    if (this.targets.length === 0) {
      this.targets = this.gatherTargets(context);
    }
    if (this.targets.length === 0) {
      return BTStatus.FAILURE;
    }
    const canvas = context.canvasManager.canvas;
    while (this.currentIndex < this.targets.length) {
      const targetId = this.targets[this.currentIndex];
      const targetObj = canvas?.getObjects().find(o => o.id === targetId);
      const childContext = {
        ...context,
        targetObj,
        iterationTargetId: targetId
      };
      const status = this.child.tick(childContext);
      if (status === BTStatus.RUNNING) return BTStatus.RUNNING;
      if (status === BTStatus.FAILURE) {
        this.reset();
        return BTStatus.FAILURE;
      }
      this.currentIndex++;
    }
    this.reset();
    return BTStatus.SUCCESS;
  }

  reset() {
    this.targets = [];
    this.currentIndex = 0;
    this.child?.reset();
  }
}

export class ConditionNode extends BTNode {
  constructor(conditionName, params) {
    super();
    this.conditionName = conditionName;
    this.params = params || {};
  }

  tick(context) {
    const { canvasManager, targetObj } = context;
    switch (this.conditionName) {
      case 'isColliding': {
        const targetB = canvasManager.canvas.getObjects().find(o => o.id === this.params.targetId);
        if (!targetB || !targetObj) return BTStatus.FAILURE;
        return targetObj.intersectsWithObject(targetB) ? BTStatus.SUCCESS : BTStatus.FAILURE;
      }
      case 'isSelected': {
        if (!targetObj) return BTStatus.FAILURE;
        return targetObj === canvasManager.canvas.getActiveObject() ? BTStatus.SUCCESS : BTStatus.FAILURE;
      }
      case 'equals': {
        const actual = context[this.params.source] ?? '';
        return actual === this.params.value ? BTStatus.SUCCESS : BTStatus.FAILURE;
      }
      default:
        return BTStatus.FAILURE;
    }
  }
}

export class BTEngine {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;
    this.activeTrees = [];
    this.isRunning = false;
    this.draggingObjects = new Set();
    this.timerHandles = new Map();

    if (this.canvasManager.registerBehaviorSyncListener) {
      this.canvasManager.registerBehaviorSyncListener(this.handleBehaviorSync.bind(this));
    }

    this.bindTriggers();
  }

  handleBehaviorSync(objects) {
    this.ensureTimerBehaviors(objects);
  }

  ensureTimerBehaviors(objects = this.canvasManager.objectsData || []) {
    const activeKeys = new Set();
    objects.forEach(obj => {
      (obj.behaviors || []).forEach(behavior => {
        if (behavior.trigger === 'onTimer') {
          const key = this.getBehaviorKey(obj.id, behavior);
          activeKeys.add(key);
          if (!this.timerHandles.has(key)) {
            this.startTimerForBehavior(obj, behavior, key);
          }
        }
      });
    });
    for (const key of Array.from(this.timerHandles.keys())) {
      if (!activeKeys.has(key)) {
        clearInterval(this.timerHandles.get(key));
        this.timerHandles.delete(key);
      }
    }
  }

  startTimerForBehavior(objectData, behavior, key) {
    const interval = Math.max(100, behavior.triggerParams?.interval || behavior.interval || 1000);
    const handle = setInterval(() => {
      const freshObject = this.canvasManager.objectsData.find(o => o.id === objectData.id);
      if (!freshObject) return;
      this.activateBehavior(freshObject, behavior, { trigger: 'onTimer', timerInterval: interval });
    }, interval);
    this.timerHandles.set(key, handle);
  }

  cleanupTimersForObject(objectId) {
    if (!objectId) return;
    for (const key of Array.from(this.timerHandles.keys())) {
      if (key.startsWith(`${objectId}_`)) {
        clearInterval(this.timerHandles.get(key));
        this.timerHandles.delete(key);
      }
    }
  }

  getBehaviorKey(objectId, behavior) {
    const behaviorId = behavior.id || behavior.name || Math.random().toString(36).slice(2, 8);
    return `${objectId}_${behavior.trigger || 'trigger'}_${behaviorId}`;
  }

  activateBehavior(objectData, behaviorConfig, triggerMeta = {}) {
    if (!behaviorConfig || !behaviorConfig.behaviorTree) return;
    const rootNode = this.parseNode(behaviorConfig.behaviorTree);
    if (!rootNode) return;
    const targetFabric = this.canvasManager.canvas?.getObjects().find(o => o.id === objectData.id);
    this.activeTrees.push({
      id: `${objectData.id}_${behaviorConfig.trigger}_${Date.now()}`,
      rootNode,
      context: {
        canvasManager: this.canvasManager,
        targetObj: targetFabric,
        behaviorTargetId: objectData.id,
        behaviorMeta: triggerMeta
      }
    });
  }

  handleTriggerEvent(triggerName, event) {
    const target = event?.target;
    if (!target || !target.id) return;
    const objectData = this.canvasManager.objectsData.find(o => o.id === target.id);
    if (!objectData || !objectData.behaviors) return;
    objectData.behaviors.forEach(behavior => {
      if (behavior.trigger === triggerName) {
        this.activateBehavior(objectData, behavior, { trigger: triggerName, event });
      }
    });
  }

  parseNode(jsonNode) {
    if (!jsonNode) return null;
    switch (jsonNode.node) {
      case 'sequence':
        return new SequenceNode((jsonNode.children || []).map(c => this.parseNode(c)).filter(Boolean));
      case 'selector':
        return new SelectorNode((jsonNode.children || []).map(c => this.parseNode(c)).filter(Boolean));
      case 'parallel':
        return new ParallelNode((jsonNode.children || []).map(c => this.parseNode(c)).filter(Boolean));
      case 'repeat': {
        const child = jsonNode.child ? this.parseNode(jsonNode.child) : this.parseNode((jsonNode.children || [])[0]);
        const count = jsonNode.params?.count ?? jsonNode.count ?? 1;
        const delay = jsonNode.params?.delay || 0;
        return new RepeatNode(child, count, delay);
      }
      case 'foreach': {
        const child = jsonNode.child ? this.parseNode(jsonNode.child) : this.parseNode((jsonNode.children || [])[0]);
        const items = jsonNode.params?.targetIds || jsonNode.params?.items || [];
        const delay = jsonNode.params?.delay || 0;
        return new ForeachNode(child, items, delay);
      }
      case 'inside': {
        const child = jsonNode.child ? this.parseNode(jsonNode.child) : this.parseNode((jsonNode.children || [])[0]);
        return new InsideNode(child, jsonNode.params);
      }
      case 'action':
        return new ActionNode(jsonNode.name, jsonNode.params, jsonNode.duration);
      case 'condition':
        return new ConditionNode(jsonNode.name, jsonNode.params);
      default:
        console.warn("未知的行为树节点类型", jsonNode.node);
        return null;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.ensureTimerBehaviors();
    const loop = () => {
      this.tickAll();
      if (this.isRunning) {
        requestAnimationFrame(loop);
      }
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    this.timerHandles.forEach(handle => clearInterval(handle));
    this.timerHandles.clear();
  }

  tickAll() {
    for (let i = this.activeTrees.length - 1; i >= 0; i--) {
      const treeInstance = this.activeTrees[i];
      const status = treeInstance.rootNode.tick(treeInstance.context);
      if (status !== BTStatus.RUNNING) {
        this.activeTrees.splice(i, 1);
      }
    }
  }

  bindTriggers() {
    const canvas = this.canvasManager.canvas;
    canvas.on('mouse:down', (e) => this.handleTriggerEvent('onClick', e));
    canvas.on('mouse:over', (e) => this.handleTriggerEvent('onHover', e));
    canvas.on('mouse:out', (e) => this.handleTriggerEvent('onHoverOut', e));
    canvas.on('object:moving', (e) => {
      const target = e.target;
      if (!target || !target.id) return;
      if (this.draggingObjects.has(target.id)) return;
      this.draggingObjects.add(target.id);
      this.handleTriggerEvent('onDrag', e);
    });
    canvas.on('mouse:up', (e) => {
      if (e?.target?.id) {
        this.draggingObjects.delete(e.target.id);
      } else {
        this.draggingObjects.clear();
      }
    });
    canvas.on('object:removed', (e) => {
      if (e?.target?.id) {
        this.cleanupTimersForObject(e.target.id);
      }
    });
  }
}

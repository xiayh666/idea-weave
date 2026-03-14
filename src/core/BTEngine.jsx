// 1. 行为树核心状态枚举
export const BTStatus = {
  SUCCESS: 1,
  FAILURE: 2,
  RUNNING: 3,
};

// 2. 基础节点
export class BTNode {
  tick(context) {
    throw new Error("必须在子类中实现 tick 方法");
  }
  // 用于重置节点状态（例如循环执行时）
  reset() {}
}

// 顺序节点 (Sequence)：按顺序执行，遇到失败则整体失败，全部成功才算成功
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
      this.currentIndex++; // SUCCESS，继续下一个
    }
    this.reset();
    return BTStatus.SUCCESS;
  }

  reset() {
    this.currentIndex = 0;
    this.children.forEach(c => c.reset());
  }
}

// 选择节点 (Selector)：实现 if-else，按顺序尝试，一个成功则整体成功
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
      this.currentIndex++; // FAILURE，尝试下一个 Fallback
    }
    this.reset();
    return BTStatus.FAILURE;
  }

  reset() {
    this.currentIndex = 0;
    this.children.forEach(c => c.reset());
  }
}

// ---------------------------------------------------------
// 【叶子节点】Leaf Nodes
// ---------------------------------------------------------

// 动作节点 (ActionNode)：执行修改、动画等
export class ActionNode extends BTNode {
  constructor(actionName, params, duration = 0) {
    super();
    this.actionName = actionName;
    this.params = params;
    this.duration = duration;
    this.startTime = null;
  }

  tick(context) {
    const { canvasManager, targetObj } = context;
    if (!targetObj) return BTStatus.FAILURE;

    // 1. 瞬时动作 (如 modify 变色)
    if (this.duration <= 0) {
      if (this.actionName === 'modify') {
        if (this.params.color) targetObj.set('fill', this.params.color);
        if (this.params.opacity !== undefined) targetObj.set('opacity', this.params.opacity);
        canvasManager.canvas.requestRenderAll();
        return BTStatus.SUCCESS;
      }
      return BTStatus.SUCCESS;
    }

    // 2. 持续动作 (如 fade, move 等动画)
    if (!this.startTime) {
      this.startTime = Date.now();
      // 这里可以记录初始状态，用于插值计算
      this.startOpacity = targetObj.opacity || 1;
    }

    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1); // 0 到 1 之间

    if (this.actionName === 'fade') {
      const targetOpacity = this.params.opacity;
      const currentOpacity = this.startOpacity + (targetOpacity - this.startOpacity) * progress;
      targetObj.set('opacity', currentOpacity);
      canvasManager.canvas.requestRenderAll();
    }
    // TODO: 实现 scale, move 的插值逻辑

    if (progress >= 1) {
      this.startTime = null; // 动画结束
      return BTStatus.SUCCESS;
    }

    return BTStatus.RUNNING; // 动画还在进行，挂起
  }

  reset() {
    this.startTime = null;
  }
}

// 条件节点 (ConditionNode)：判断碰撞等
export class ConditionNode extends BTNode {
  constructor(conditionName, params) {
    super();
    this.conditionName = conditionName;
    this.params = params;
  }

  tick(context) {
    const { canvasManager, targetObj } = context;

    if (this.conditionName === 'isColliding') {
      const targetB = canvasManager.canvas.getObjects().find(o => o.id === this.params.target);
      if (!targetB || !targetObj) return BTStatus.FAILURE;

      // 使用 Fabric.js 内置的碰撞检测算法
      const isHit = targetObj.intersectsWithObject(targetB);
      return isHit ? BTStatus.SUCCESS : BTStatus.FAILURE;
    }

    return BTStatus.FAILURE;
  }
}



export class BTEngine {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;
    this.activeTrees = []; // 当前正在运行的行为树实例
    this.isRunning = false;

    // 绑定原生事件以触发行为树
    this.bindTriggers();
  }

  // JSON 节点解析为行为树的节点
  parseNode(jsonNode) {
    if (!jsonNode) return null;

    switch (jsonNode.node) {
      case 'sequence':
        return new SequenceNode(jsonNode.children.map(c => this.parseNode(c)));
      case 'selector':
        return new SelectorNode(jsonNode.children.map(c => this.parseNode(c)));
      case 'action':
        return new ActionNode(jsonNode.name, jsonNode.params, jsonNode.duration);
      case 'condition':
        return new ConditionNode(jsonNode.name, jsonNode.params);
      default:
        console.warn("未知节点类型:", jsonNode.node);
        return new BTNode(); // 空节点防止报错
    }
  }

  // 启动引擎的 Tick 循环
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
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
  }

  // 每帧遍历执行所有活跃的树
  tickAll() {
    // 倒序遍历，方便在执行结束时安全移除树
    for (let i = this.activeTrees.length - 1; i >= 0; i--) {
      const treeInstance = this.activeTrees[i];
      const status = treeInstance.rootNode.tick(treeInstance.context);

      // 如果树返回了 SUCCESS 或 FAILURE，说明这棵树的生命周期结束了，将其移除
      if (status !== BTStatus.RUNNING) {
        this.activeTrees.splice(i, 1);
      }
    }
  }

  // 监听画布事件，将行为树加入活跃队列
 bindTriggers() {
  const canvas = this.canvasManager.canvas;

  // 监听全画板的点击事件
  canvas.on('mouse:down', (e) => {
    if (!e.target) return;
    
    const activeObjId = e.target.id;
    
    const objectData = this.canvasManager.objectsData.find(o => o.id === activeObjId);
    if (!objectData || !objectData.behaviors) return;

    // 遍历挂载在这个对象下的所有行为
    objectData.behaviors.forEach(behaviorConfig => {
      // 如果这个行为是由 onClick 触发的
      if (behaviorConfig.trigger === 'onClick') {
        
        this.activeTrees.push({
          id: `${activeObjId}_onClick_${Date.now()}`,
          rootNode: this.parseNode(behaviorConfig.behaviorTree),
          context: {
            canvasManager: this.canvasManager,
            targetObj: e.target,
          }
        });
      }
    });
  });
} 
}
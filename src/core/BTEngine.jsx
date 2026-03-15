import utils from "../utils/utils";

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
  reset() { }
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

    // 1. 瞬时动作 (保持不变)
    if (!this.duration || this.duration <= 0) {
      if (this.actionName === 'modify') {
        if (this.params.color) targetObj.set('fill', this.params.color);
        if (this.params.opacity !== undefined) targetObj.set('opacity', this.params.opacity);
        if (this.params.text) targetObj.set('text', this.params.text);
      } else if (this.actionName === 'move') {
        // 如果 duration 为 0 的瞬间移动（如传送）
        const newLeft = (targetObj.left || 0) + (this.params.dx || 0);
        const newTop = (targetObj.top || 0) + (this.params.dy || 0);
        targetObj.set({ left: newLeft, top: newTop });
      }

      canvasManager.canvas.requestRenderAll();
      return BTStatus.SUCCESS;
    }

    // 2. 持续动作初始化
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

    // ================= 🌟 缓动核心逻辑 =================
    const elapsed = Date.now() - this.startTime;
    const linearProgress = Math.min(elapsed / this.duration, 1); // 真实的线性时间(0到1)

    // 允许指令中指定缓动类型，默认使用最舒服的 'easeOutCubic'
    const easingType = (this.params && this.params.easing) ? this.params.easing : 'easeOutCubic';
    const easeFn = utils.easing[easingType] || utils.easing.linear;

    // 得到经过缓动曲线“扭曲”后的动画进度！
    const progress = easeFn(linearProgress);
    // ===================================================

    // 执行插值逻辑 (这里完全不用改，直接使用算出来的 progress 即可)
    switch (this.actionName) {
      case 'fade': {
        const targetOpacity = this.params.opacity ?? 1;
        targetObj.set('opacity', this.startState.opacity + (targetOpacity - this.startState.opacity) * progress);
        break;
      }
      case 'move': {
        const dx = this.params.dx || 0;
        const dy = this.params.dy || 0;
        targetObj.set({
          left: this.startState.left + dx * progress,
          top: this.startState.top + dy * progress
        });
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
    }

    if (this.actionName !== 'wait') {
      canvasManager.canvas.requestRenderAll();
    }

    // 3. 检查是否结束 (判断结束要用真实的线性时间 linearProgress，不能用 progress)
    if (linearProgress >= 1) {
      this.startTime = null;
      this.startState = null;

      // 为了防止有些像 Elastic 的缓动函数在结尾产生微小误差，
      // 可以在结束时强制设置一次最终目标值 (可选，这里为代码简洁省略)

      return BTStatus.SUCCESS;
    }

    return BTStatus.RUNNING;
  }

  tick_(context) {
    // console.log("tick action, context:", context)
    const { canvasManager, targetObj } = context;
    if (!targetObj) return BTStatus.FAILURE;

    // 1. 瞬时动作 (如 modify 变色, 或 duration <= 0 的情况)
    if (!this.duration || this.duration <= 0) {
      if (this.actionName === 'modify') {
        if (this.params.color) targetObj.set('fill', this.params.color);
        if (this.params.opacity !== undefined) targetObj.set('opacity', this.params.opacity);
        if (this.params.text) targetObj.set('text', this.params.text);
      } else if (this.actionName === 'move') {
        // 如果 duration 为 0 的瞬间移动（如传送）
        const newLeft = (targetObj.left || 0) + (this.params.dx || 0);
        const newTop = (targetObj.top || 0) + (this.params.dy || 0);
        targetObj.set({ left: newLeft, top: newTop });
      }

      canvasManager.canvas.requestRenderAll();
      return BTStatus.SUCCESS;
    }

    // 2. 持续动作 (如 fade, move, scale, rotate, wait 等动画)

    // 初始化动画状态（仅在动作刚开始的第一帧执行）
    if (!this.startTime) {
      this.startTime = Date.now();

      // 🌟 核心改进：统一记录初始状态，作为插值(Interpolation)的起点
      // 注意：Fabric.js 中坐标通常用 left 和 top
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
    // progress 取值 0 到 1，确保不会因为时间超限导致动画越界
    const progress = Math.min(elapsed / this.duration, 1);

    // 执行插值逻辑
    switch (this.actionName) {
      case 'fade': {
        const targetOpacity = this.params.opacity ?? 1;
        const currentOpacity = this.startState.opacity + (targetOpacity - this.startState.opacity) * progress;
        targetObj.set('opacity', currentOpacity);
        break;
      }

      case 'move': {
        // 根据数据集，move 使用的是 dx 和 dy (相对移动)
        const dx = this.params.dx || 0;
        const dy = this.params.dy || 0;
        const currentLeft = this.startState.left + dx * progress;
        const currentTop = this.startState.top + dy * progress;
        targetObj.set({ left: currentLeft, top: currentTop });
        break;
      }

      case 'scale': {
        // scale 通常是绝对缩放 (比如放大到 1.5 倍)
        const targetScaleX = this.params.scaleX ?? this.startState.scaleX;
        const targetScaleY = this.params.scaleY ?? this.startState.scaleY;
        const currentScaleX = this.startState.scaleX + (targetScaleX - this.startState.scaleX) * progress;
        const currentScaleY = this.startState.scaleY + (targetScaleY - this.startState.scaleY) * progress;
        targetObj.set({ scaleX: currentScaleX, scaleY: currentScaleY });
        break;
      }

      case 'rotate': {
        // 根据数据集，rotate 使用 angle，通常指相对旋转（比如顺时针转 90 度）
        const dAngle = this.params.angle || 0;
        const currentAngle = this.startState.angle + dAngle * progress;
        targetObj.set('angle', currentAngle);
        break;
      }

      case 'wait': {
        // wait 什么都不做，纯粹为了消耗时间
        break;
      }

      default:
        console.warn(`未知的 Action 类型: ${this.actionName}`);
        break;
    }

    // 只有非 wait 动作才需要重绘画布，节省性能
    if (this.actionName !== 'wait') {
      canvasManager.canvas.requestRenderAll();
    }

    // 3. 检查是否结束
    if (progress >= 1) {
      this.startTime = null; // 🌟 极其重要：清理状态，以便这个动作以后（比如在 repeat 节点中）可以被再次触发
      this.startState = null;
      return BTStatus.SUCCESS;
    }

    return BTStatus.RUNNING; // 动画还在进行，返回挂起状态让引擎下一帧继续 Tick
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
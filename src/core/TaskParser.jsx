export class TaskParser {
  /**
   * @param {ActionEngine} actionEngine
   * @param {Object} canvasManager - 传入 Canvas 管理器
   */
  constructor(actionEngine, canvasManager) {
    this.engine = actionEngine;
    this.canvasManager = canvasManager;
    this.canvas = canvasManager.canvas;
  }

  /**
   * 解析并应用大模型返回的完整 Task JSON
   */
  processTask(taskJson) {
    console.log(`[TaskParser] 开始处理任务: ${taskJson.task_id}`);

    // 1. 处理立即行为 (立刻执行)
    if (taskJson.immediate_actions && taskJson.immediate_actions.length > 0) {
      taskJson.immediate_actions.forEach(action => {
        // 立即执行不需要特殊的 triggerObject 上下文
        this.engine.execute(action, { triggerType: 'immediate' });
      });
    }

    // 2. 处理事件绑定 (挂载到 Fabric.js 事件系统)
    if (taskJson.event_bindings && taskJson.event_bindings.length > 0) {
      taskJson.event_bindings.forEach(binding => {
        this.bindEvent(binding);
      });
    }
  }

  bindEvent(binding) {
    const { cmd, args } = binding;
    
    // 映射 JSON 事件到 Fabric.js 原生事件
    const eventMap = {
      'onClick': 'mousedown',
      'onDrag': 'moving',
      'onHoverIn': 'mouseover',
      'onHoverOut': 'mouseout'
    };

    const fabricEventName = eventMap[cmd];
    if (!fabricEventName) {
      console.warn(`[TaskParser] 不支持的事件绑定指令: ${cmd}`);
      return;
    }

    // 在画布级别全局监听，然后过滤 target
    this.canvas.on(fabricEventName, (e) => {
      // e.target 是 Fabric 触发事件的原生对象
      if (!e.target || e.target.id !== args.target) return;

      console.log(`[TaskParser] 触发事件: ${cmd} on ${args.target}`);
      
      // 触发时，构建上下文 Context
      const context = {
        triggerType: cmd,
        triggerObject: e.target, // 把被点击/拖拽的对象注入进去，方便引擎解析 'this'
        fabricEvent: e.e // 原生浏览器事件对象
      };

      // 遍历执行绑定好的动作队列
      args.action.forEach(action => {
        this.engine.execute(action, context);
      });
    });
  }
}
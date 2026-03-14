# 行为树引擎使用指南

## 1. 概述

行为树交互引擎是完整的“图灵完备”图形逻辑系统，采用“实体-行为树”解耦架构，包含：

* **触发器 (Triggers)**：onClick、onDrag、onHover、onHoverOut、onTimer
* **组合/装饰节点 (Composite/Decorator Nodes)**：sequence (顺序)、selector (选择/分支)、parallel (并行)、repeat (循环)、foreach (遍历)
* **叶子节点 (Leaf Nodes)**：
* **条件判断 (Condition)**：isColliding、isSelected、equals
* **执行动作 (Action)**：modify、move、rotate、scale、fade、wait、call



所有对象的行为配置都统一存放在 `behaviors` 数组中。

## 2. 触发器 (Triggers)

触发器用于唤醒行为树，它们位于配置的最外层。

### 2.1 onClick (点击触发)

当用户点击物体时触发的行为树。

```json
{
  "trigger": "onClick",
  "behaviorTree": {
    "node": "action",
    "name": "modify",
    "params": {"color": "#ff0000"}
  }
}

```

**示例**：

```
用户输入："创建一个矩形，点击时变红"

```

### 2.2 onDrag (拖拽触发)

当用户拖拽物体时持续触发的行为树。

```json
{
  "trigger": "onDrag",
  "behaviorTree": {
    "node": "action",
    "name": "modify",
    "params": {"opacity": 0.5}
  }
}

```

**示例**：

```
用户输入："创建一个矩形，拖拽时变成半透明"

```

### 2.3 onHover / onHoverOut (悬停/移出触发)

当鼠标进入或离开物体时触发。

```json
{
  "trigger": "onHover",
  "behaviorTree": {
    "node": "action",
    "name": "scale",
    "params": {"scaleX": 1.5, "scaleY": 1.5},
    "duration": 300
  }
}

```

**示例**：

```
用户输入："创建一个矩形，鼠标悬停时平滑放大"

```

### 2.4 onTimer (定时器触发)

定期自动执行的行为树。

```json
{
  "trigger": "onTimer",
  "triggerParams": { "interval": 1000 },
  "behaviorTree": {
    "node": "action",
    "name": "rotate",
    "params": {"angle": 30},
    "duration": 500
  }
}

```

**示例**：

```
用户输入："创建一个箭头，每秒自动旋转30度"

```

## 3. 逻辑控制节点 (Composite & Decorator Nodes)

### 3.1 selector (选择/条件分支)

完美替代 if-else。按顺序尝试子节点，**只要有一个成功就返回成功**。常与 condition 节点组合使用。

```json
{
  "node": "selector",
  "children": [
    {
      "node": "sequence",
      "children": [
        { "node": "condition", "name": "isColliding", "params": {"targetId": "obj-2"} },
        { "node": "action", "name": "modify", "params": {"color": "red"} }
      ]
    },
    {
      "node": "action",
      "name": "modify",
      "params": {"color": "blue"}
    }
  ]
}

```

**示例**：

```
用户输入："创建一个矩形，如果碰撞则变红，否则保持蓝色"

```

### 3.2 repeat (重复执行)

重复执行其包裹的子树。

```json
{
  "node": "repeat",
  "params": { "count": 3 },
  "child": {
    "node": "action",
    "name": "fade",
    "params": {"opacity": 0},
    "duration": 500
  }
}

```

**示例**：

```
用户输入："让obj-1闪烁3次"

```

### 3.3 sequence (顺序执行)

按顺序执行一组行为，上一个执行完毕（SUCCESS）才执行下一个。

```json
{
  "node": "sequence",
  "children": [
    { "node": "action", "name": "modify", "params": {"color": "red"} },
    { "node": "action", "name": "wait", "duration": 1000 },
    { "node": "action", "name": "modify", "params": {"color": "blue"} }
  ]
}

```

**示例**：

```
用户输入："先变红，等待1秒，再变蓝"

```

### 3.4 parallel (并行执行)

同时执行一组行为。

```json
{
  "node": "parallel",
  "children": [
    { "node": "action", "name": "rotate", "params": {"angle": 360}, "duration": 2000 },
    { "node": "action", "name": "scale", "params": {"scaleX": 1.5, "scaleY": 1.5}, "duration": 2000 }
  ]
}

```

**示例**：

```
用户输入："创建一个同时旋转和缩放的圆形"

```

### 3.5 foreach (遍历执行)

遍历列表并执行行为。

```json
{
  "node": "foreach",
  "params": { "targetIds": ["obj-1", "obj-2", "obj-3"] },
  "child": {
    "node": "action",
    "name": "scale",
    "params": {"scaleX": 2.0, "scaleY": 2.0},
    "duration": 500
  }
}

```

**示例**：

```
用户输入："让指定的三个方块同时变大"

```

## 4. 复合行为树示例

### 4.1 闪烁效果 (Repeat + Sequence)

```json
{
  "trigger": "onClick",
  "behaviorTree": {
    "node": "repeat",
    "params": { "count": 3 },
    "child": {
      "node": "sequence",
      "children": [
        { "node": "action", "name": "fade", "params": {"opacity": 0}, "duration": 200 },
        { "node": "action", "name": "fade", "params": {"opacity": 1}, "duration": 200 }
      ]
    }
  }
}

```

### 4.2 拖拽碰撞变色 (Selector 实现 If-Else)

```json
{
  "trigger": "onDrag",
  "behaviorTree": {
    "node": "selector",
    "children": [
      {
        "node": "sequence",
        "children": [
          { "node": "condition", "name": "isColliding", "params": {"targetId": "danger-zone"} },
          { "node": "action", "name": "modify", "params": {"color": "red"} }
        ]
      },
      {
        "node": "action", "name": "modify", "params": {"color": "green"}
      }
    ]
  }
}

```

### 4.3 复杂顺序与并行动画

```json
{
  "trigger": "onClick",
  "behaviorTree": {
    "node": "sequence",
    "children": [
      {
        "node": "action", "name": "modify", "params": {"color": "#ff0000"}
      },
      {
        "node": "parallel",
        "children": [
          { "node": "action", "name": "move", "params": {"dx": 100, "dy": 0}, "duration": 500 },
          { "node": "action", "name": "scale", "params": {"scaleX": 1.5, "scaleY": 1.5}, "duration": 500 }
        ]
      }
    ]
  }
}

```

## 5. 使用方法

### 5.1 自然语言命令

直接使用自然语言描述你的需求：

```
"让obj-1点击时闪烁3次"
"创建一个每秒旋转30度的箭头"
"创建一个矩形，如果碰撞到目标就变红，否则保持蓝色"
"创建一个圆形，点击时先变红，然后同时向右移动并放大"

```

### 5.2 手动配置

在 PropertyPanel 中手动配置行为：

1. 选择物体
2. 在"行为"配置项中选择触发器（如 onClick）
3. 组合添加行为树节点（Sequence, Action 等）
4. 配置参数

### 5.3 AI 生成

通过自然语言描述，AI 会自动生成带有行为树的标准 JSON 配置：

```
用户输入："创建一个矩形，拖拽时如果碰到obj-1就变绿"
AI 返回：
{
  "type": "rect",
  "id": "drag-box-1",
  "fillColor": "#3862f6",
  "x": 400, "y": 300,
  "width": 100, "height": 100,
  "behaviors": [
    {
      "trigger": "onDrag",
      "behaviorTree": {
        "node": "selector",
        "children": [
          {
            "node": "sequence",
            "children": [
              { "node": "condition", "name": "isColliding", "params": {"targetId": "obj-1"} },
              { "node": "action", "name": "modify", "params": {"color": "#00ff00"} }
            ]
          }
        ]
      }
    }
  ]
}

```

## 6. 行为树执行流程 (Engine Tick)

1. **唤醒 (Trigger)**：用户操作（拖拽、点击等）命中配置的 `trigger`。
2. **建树 (Build)**：BTEngine 根据 JSON 瞬间实例化一棵行为树。
3. **心跳 (Tick)**：在 `requestAnimationFrame` (每秒60帧) 中，引擎不断 Tick 活跃的树。
4. **状态流转 (Status)**：带有 `duration` 的动画在播放时返回 `RUNNING` 挂起线程，播放完毕返回 `SUCCESS`。
5. **自动销毁 (Destroy)**：当树的根节点返回 `SUCCESS` 或 `FAILURE` 时，树的生命周期结束，自动移出引擎。

## 7. 注意事项

1. **禁止死循环**：`while` 逻辑已被 `repeat` 和定时触发器取代，行为树绝不会导致浏览器阻塞。
2. **状态同步**：瞬时 Action 和 持续动画 Action 在执行完毕后，引擎会自动调用 `CanvasManager.modifyObject()` 将最终状态同步回 React，**不要手动干预**。
3. **Selector 兜底逻辑**：在设计 `if-else` 时，务必在 `selector` 的最后放入一个一定能 SUCCESS 的无条件 Action 作为兜底（Fallback），以保证状态恢复。

## 8. 完整示例

### 8.1 交互式游戏：躲避下落方块

```
用户输入："创建一个红色方块(玩家)，可以拖拽。如果有落下的石头碰到玩家，玩家闪烁消失。"

```

AI 生成解析：

* 玩家控制：挂载 `onDrag` 触发器，内部只做拖拽无需额外配置。
* 石头下落：挂载 `onTimer`，行为树为 `move` 向下移动。
* 碰撞检测：挂载在玩家上的 `onTimer`，每秒Tick检查：
`selector` -> `sequence` (检查条件 `isColliding` 匹配石头 -> `repeat` 闪烁 -> `fade` 消失)。

## 9. 调试技巧

1. **检查活跃树**：在控制台打印 `BTEngine.activeTrees`，观察动画卡住时是否有一直处于 `RUNNING` 状态的孤儿树。
2. **分离条件与动作**：先测试 `action` 是否生效，再往外包裹 `condition` 和 `selector`。
3. **合理使用 Wait**：在复杂的 `sequence` 中插入 `wait` 节点，可以像打断点一样观察每一步的状态变化。

## 10. 性能优化

1. **避免全局高频 Timer**：对于碰撞检测，尽量挂载在物体的 `onDrag` 触发器上，而不是全局起一个高频 `onTimer`。
2. **利用 Parallel**：多个动画同时播放必须使用 `parallel` 节点，它能确保多个动画在同一个 `requestAnimationFrame` 周期内平滑渲染。
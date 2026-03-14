# 四大原语体系使用指南

## 1. 概述

四大原语体系是完整的交互行为系统，包含：

- **事件原语**：onDrag、onHover、onHoverOut、onTimer
- **逻辑原语**：if、repeat、wait、while、foreach、call、sequence、parallel

## 2. 事件原语

### 2.1 onDrag (拖拽事件)

当用户拖拽物体时触发的行为。

```json
{
  "action": "drag",
  "params": {
    "onDrag": {
      "targetId": "目标物体ID",
      "action": {
        "action": "modify|rotate|scale|fade",
        "params": {...},
        "duration": 1000
      }
    }
  }
}
```

**示例**：
```
用户输入："创建一个矩形，拖拽时让obj-1变绿"
```

### 2.2 onHover (悬停事件)

当鼠标悬停在物体上时触发的行为。

```json
{
  "action": "hover",
  "params": {
    "onHover": {
      "targetId": "目标物体ID",
      "action": {
        "action": "modify|rotate|scale|fade",
        "params": {...},
        "duration": 1000
      }
    }
  }
}
```

**示例**：
```
用户输入："创建一个矩形，鼠标悬停时变大"
```

### 2.3 onHoverOut (悬停退出事件)

当鼠标离开物体时触发的行为。

```json
{
  "action": "hoverOut",
  "params": {
    "onHoverOut": {
      "targetId": "目标物体ID",
      "action": {
        "action": "modify|rotate|scale|fade",
        "params": {...},
        "duration": 1000
      }
    }
  }
}
```

**示例**：
```
用户输入："创建一个矩形，鼠标离开时恢复原始大小"
```

### 2.4 onTimer (定时器事件)

定期执行的行为。

```json
{
  "action": "timer",
  "params": {
    "interval": 1000,
    "actions": [
      {
        "action": "modify|rotate|scale|fade",
        "params": {...},
        "duration": 1000
      }
    ]
  }
}
```

**示例**：
```
用户输入："创建一个每秒旋转30度的箭头"
```

## 3. 逻辑原语

### 3.1 if (条件判断)

根据条件执行不同的行为。

```json
{
  "action": "if",
  "params": {
    "condition": "isColliding|isSelected|equals(prop,value)",
    "then": [...],
    "else": [...]
  }
}
```

**支持的条件**：
- `isColliding`：物体正在碰撞
- `isSelected`：物体被选中
- `equals(prop,value)`：属性等于指定值

**示例**：
```
用户输入："创建一个矩形，如果碰撞则变红，否则保持蓝色"
```

### 3.2 repeat (重复执行)

重复执行一组行为。

```json
{
  "action": "repeat",
  "params": {
    "count": 3,
    "delay": 100,
    "actions": [...]
  }
}
```

**示例**：
```
用户输入："让obj-1闪烁3次"
```

### 3.3 wait (等待延迟)

等待指定时间。

```json
{
  "action": "wait",
  "params": {
    "duration": 1000
  }
}
```

**示例**：
```
用户输入："先变红，等待1秒，再变蓝"
```

### 3.4 while (循环执行)

在条件满足时循环执行。

```json
{
  "action": "while",
  "params": {
    "condition": "isColliding|isSelected",
    "interval": 100,
    "actions": [...]
  }
}
```

**示例**：
```
用户输入："创建一个圆形，当它被选中时持续旋转"
```

### 3.5 foreach (遍历执行)

遍历列表并执行行为。

```json
{
  "action": "foreach",
  "params": {
    "items": ["obj-1", "obj-2", "obj-3"],
    "action": {...}
  }
}
```

**示例**：
```
用户输入："让所有的方块同时变大"
```

### 3.6 call (调用行为)

调用其他物体的行为。

```json
{
  "action": "call",
  "params": {
    "targetId": "目标物体ID",
    "actionName": "行为名称"
  }
}
```

### 3.7 sequence (顺序执行)

按顺序执行一组行为。

```json
{
  "action": "sequence",
  "params": {
    "actions": [...]
  }
}
```

**示例**：
```
用户输入："创建一个先变红再变蓝的正方形"
```

### 3.8 parallel (并行执行)

并行执行一组行为。

```json
{
  "action": "parallel",
  "params": {
    "actions": [...]
  }
}
```

**示例**：
```
用户输入："创建一个同时旋转和缩放的圆形"
```

## 4. 复合行为示例

### 4.1 闪烁效果

```json
{
  "action": "repeat",
  "params": {
    "count": 3,
    "delay": 200,
    "actions": [
      {
        "action": "fade",
        "params": {"opacity": 0},
        "duration": 100
      },
      {
        "action": "wait",
        "params": {"duration": 100}
      },
      {
        "action": "fade",
        "params": {"opacity": 1},
        "duration": 100
      }
    ]
  }
}
```

### 4.2 碰撞后闪烁

```json
{
  "action": "if",
  "params": {
    "condition": "isColliding",
    "then": [
      {
        "action": "repeat",
        "params": {
          "count": 3,
          "actions": [...]
        }
      }
    ]
  }
}
```

### 4.3 悬停效果

```json
[
  {
    "action": "hover",
    "params": {
      "onHover": {
        "targetId": "Hover_Rect",
        "action": {
          "action": "scale",
          "params": {"scale": 1.5},
          "duration": 300
        }
      }
    }
  },
  {
    "action": "hoverOut",
    "params": {
      "onHoverOut": {
        "targetId": "Hover_Rect",
        "action": {
          "action": "scale",
          "params": {"scale": 1.0},
          "duration": 300
        }
      }
    }
  }
]
```

### 4.4 顺序动画

```json
{
  "action": "sequence",
  "params": {
    "actions": [
      {
        "action": "modify",
        "params": {"color": "#ff0000"},
        "duration": 500
      },
      {
        "action": "wait",
        "params": {"duration": 500}
      },
      {
        "action": "modify",
        "params": {"color": "#0000ff"},
        "duration": 500
      }
    ]
  }
}
```

### 4.5 并行动画

```json
{
  "action": "parallel",
  "params": {
    "actions": [
      {
        "action": "rotate",
        "params": {"rotation": 360},
        "duration": 2000
      },
      {
        "action": "scale",
        "params": {"scale": 1.5},
        "duration": 2000
      }
    ]
  }
}
```

## 5. 使用方法

### 5.1 自然语言命令

直接使用自然语言描述你的需求：

```
"让obj-1闪烁3次"
"创建一个每秒旋转30度的箭头"
"创建一个矩形，鼠标悬停时变大，离开时恢复"
"创建一个先变红再变蓝的正方形"
"创建一个同时旋转和缩放的圆形"
"创建一个矩形，如果碰撞则变红，否则保持蓝色"
"创建一个圆形，当它被选中时持续旋转"
"创建一个矩形，拖拽时让obj-1变绿"
"让所有的方块同时变大"
```

### 5.2 手动配置

在 PropertyPanel 中手动配置行为：

1. 选择物体
2. 在"行为"配置项中添加行为
3. 选择行为类型（事件原语或逻辑原语）
4. 配置参数

### 5.3 AI 生成

通过自然语言描述，AI 会自动生成对应的 JSON 配置：

```
用户输入："创建一个矩形，拖拽时让obj-1变绿"
AI 返回：
{
  "type": "CREATE",
  "shape": "rect",
  "color": "#3862f6",
  "position": {"x": 400, "y": 300},
  "size": {"width": 100, "height": 100},
  "name": "Drag_Trigger",
  "behaviors": [{
    "id": "bh-010",
    "name": "拖拽触发",
    "action": "drag",
    "params": {
      "onDrag": {
        "targetId": "obj-1",
        "action": {
          "action": "modify",
          "params": {"color": "#00ff00"},
          "duration": 500
        }
      }
    }
  }]
}
```

## 6. 行为执行流程

1. **事件触发**：用户操作（拖拽、悬停等）或定时器触发
2. **条件判断**：执行 if/while 等逻辑原语
3. **行为执行**：执行 modify/rotate/scale/fade 等动作
4. **状态同步**：将状态变化同步到 React

## 7. 注意事项

1. **行为顺序**：多个行为按数组顺序执行
2. **异步处理**：wait、sequence 等支持异步执行
3. **状态同步**：所有动画结束后自动同步到 React
4. **性能优化**：避免过多的定时器和循环

## 8. 完整示例

### 8.1 交互式仪表盘

```
用户输入："创建一个仪表盘，包含3个指标卡片，鼠标悬停时放大，点击时显示详细信息"
```

AI 生成：
- 3个卡片（矩形）
- 悬停放大（hover + scale）
- 点击显示信息（mousedown + call）

### 8.2 动态图表

```
用户输入："创建一个动态图表，数据每秒更新，超出阈值时变红"
```

AI 生成：
- 定时器（timer）
- 数据更新（modify）
- 条件判断（if）

### 8.3 交互式游戏

```
用户输入："创建一个躲避游戏，玩家控制圆形，躲避下落的方块，碰到则游戏结束"
```

AI 生成：
- 玩家控制（drag）
- 方块下落（timer + move）
- 碰撞检测（while + if）
- 游戏结束（modify + fade）

## 9. 调试技巧

1. **查看控制台**：检查行为执行日志
2. **简化测试**：先测试单个行为，再组合
3. **逐步添加**：逐步添加行为，观察效果
4. **使用 delay**：在复杂行为中添加 delay，便于观察

## 10. 性能优化

1. **减少定时器**：使用并行代替多个定时器
2. **优化循环**：避免无限循环
3. **条件优化**：使用高效的条件判断
4. **状态同步**：批量同步状态，减少重渲染

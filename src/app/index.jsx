import { Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AiChatFooter } from '../components/AiChatFooter';
import Header from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { PropertyPanel } from '../components/PropertyPanel';
import { Toolbar } from '../components/Toolbar';
import { CanvasRenderer, useCanvas } from '../hooks/useCanvas';
import { logTrainingData } from '../utils/trainingDataLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isMobile = Platform.OS !== 'web';

const INITIAL_OBJECTS = [
  { 
    id: 'obj-1', 
    name: 'Object_1', 
    type: 'rect', 
    x: 100, 
    y: 100, 
    width: 80, 
    height: 80, 
    fillColor: '#3862f6', 
    borderRadius: 8, 
    behaviors: [
      {
        id: 'bh-1',
        name: '初始旋转',
        action: 'rotate',
        duration: 1.0,
        params: { rotation: 360 },
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ] 
  },
  { 
    id: 'obj-2', 
    name: 'Title_Text', 
    type: 'text', 
    x: 100, 
    y: 50, 
    text: 'Hello IdeaWeave', 
    fontSize: 18, 
    fillColor: '#1e293b', 
    behaviors: [
      {
        id: 'bh-2',
        name: '初始淡入',
        action: 'fade',
        duration: 1.0,
        params: { opacity: 1 },
        createdAt: new Date().toISOString(),
        createdBy: 'system'
      }
    ] 
  }
];

// 存储对话历史
let conversationHistory = [];

// 颜色格式校验函数
const validateColor = (color) => {
  // 检查是否为有效的十六进制颜色
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (hexColorRegex.test(color)) {
    return color;
  }
  // 如果不是有效的十六进制颜色，返回默认颜色
  return '#3862f6';
};

// 相对位置计算函数
const calculateRelativePosition = (relativePosition, targetObj, newObjSize) => {
  if (!targetObj || !relativePosition) return null;
  
  const { direction, offset = 10 } = relativePosition;
  const targetCenterX = targetObj.x + targetObj.width / 2;
  const targetCenterY = targetObj.y + targetObj.height / 2;
  const targetRight = targetObj.x + targetObj.width;
  const targetBottom = targetObj.y + targetObj.height;
  
  let x, y;
  
  switch (direction) {
    case 'left':
      x = targetObj.x - newObjSize.width - offset;
      y = targetCenterY - newObjSize.height / 2;
      break;
    case 'right':
      x = targetRight + offset;
      y = targetCenterY - newObjSize.height / 2;
      break;
    case 'top':
      x = targetCenterX - newObjSize.width / 2;
      y = targetObj.y - newObjSize.height - offset;
      break;
    case 'bottom':
      x = targetCenterX - newObjSize.width / 2;
      y = targetBottom + offset;
      break;
    case 'top-left':
      x = targetObj.x - newObjSize.width - offset;
      y = targetObj.y - newObjSize.height - offset;
      break;
    case 'top-right':
      x = targetRight + offset;
      y = targetObj.y - newObjSize.height - offset;
      break;
    case 'bottom-left':
      x = targetObj.x - newObjSize.width - offset;
      y = targetBottom + offset;
      break;
    case 'bottom-right':
      x = targetRight + offset;
      y = targetBottom + offset;
      break;
    case 'center':
      x = targetCenterX - newObjSize.width / 2;
      y = targetCenterY - newObjSize.height / 2;
      break;
    case 'inside':
      // 在目标物体内部居中
      x = targetObj.x + (targetObj.width - newObjSize.width) / 2;
      y = targetObj.y + (targetObj.height - newObjSize.height) / 2;
      break;
    case 'outside':
      // 默认放在右侧
      x = targetRight + offset;
      y = targetCenterY - newObjSize.height / 2;
      break;
    default:
      return null;
  }
  
  // 确保坐标在画布范围内
  return {
    x: Math.max(0, Math.min(750, x)),
    y: Math.max(0, Math.min(550, y))
  };
};

const askAI = async (userInput, currentObjects, selectedObj) => {
  const API_KEY = "sk-4ddc42fea38a4368b93263d55f0b59cd"; 
  const BASE_URL = "https://api.deepseek.com/v1/chat/completions";

  const systemPrompt = `你是一个专业的绘图助手，必须严格按照以下JSON schema返回结果。

重要：请以纯json格式返回，不要添加任何额外文本。

=== 上下文管理与指代消解 ===

【指代消解规则】
1. 单数代词指代：
   - "它"、"这个"、"那个"、"刚才那个"、"刚才创建的" → 优先使用当前选中物体的ID
   - 如果没有选中物体，使用最近创建的物体的ID
   - 如果都没有，创建新物体

2. 复数代词指代：
   - "所有的方块"、"所有的圆形"、"所有的文本" → 返回包含多个目标ID的数组
   - "它们" → 如果上一次操作涉及多个物体，使用那些物体的ID数组

3. 类型匹配规则：
   - "方块"、"矩形"、"正方形" → 匹配 type 为 "rect" 的物体
   - "圆形"、"圆" → 匹配 type 为 "circle" 的物体
   - "文本"、"文字" → 匹配 type 为 "text" 的物体
   - "三角形" → 匹配 type 为 "triangle" 的物体

4. 名称匹配规则：
   - 如果用户提到具体名称（如"Title_Text"、"Red_Square"），精确匹配 name 属性
   - 如果名称不区分大小写，进行不区分大小写的匹配

5. 位置匹配规则：
   - "左边的"、"右边的"、"上面的"、"下面的" → 根据坐标位置匹配物体
   - "中间的"、"中心的" → 匹配靠近画布中心的物体

【多目标操作格式】
当用户要求对多个物体进行操作时，使用以下格式：

{
  "type": "MODIFY" | "ANIMATE" | "DELETE",
  "ids": ["obj-1", "obj-2", "obj-3"], // 多个目标ID的数组
  "properties": { ... }, // 仅MODIFY需要
  "action": "...", // 仅ANIMATE需要
  "duration": 1.0, // 仅ANIMATE需要
  "params": { ... } // 仅ANIMATE需要
}

【指代消解示例】
用户输入："创建一个红色正方形"
返回：{"type":"CREATE","shape":"rect","color":"#ff0000","position":{"x":400,"y":300},"size":{"width":100,"height":100},"name":"Red_Square"}

用户输入："把它变大"
返回：{"type":"MODIFY","id":"Red_Square","properties":{"size":{"width":150,"height":150}}}

用户输入："创建一个蓝色圆形"
返回：{"type":"CREATE","shape":"circle","color":"#0000ff","position":{"x":200,"y":200},"size":{"width":80,"height":80},"name":"Blue_Circle"}

用户输入："让所有的方块变成绿色"
返回：{"type":"MODIFY","ids":["Red_Square","obj-123"],"properties":{"color":"#00ff00"}}

用户输入："删除所有的圆形"
返回：{"type":"DELETE","ids":["Blue_Circle","obj-456"]}

用户输入："让它们旋转"
返回：{"type":"ANIMATE","ids":["Red_Square","Blue_Circle"],"action":"rotate","duration":1.0,"params":{"rotation":360}}

=== 画布信息 ===
- 画布宽度：800px
- 画布高度：600px
- 坐标原点：左上角 (0, 0)
- 推荐坐标范围：x: 0-750, y: 0-550
- 推荐尺寸范围：宽度和高度 10-200px

=== 当前物体列表 ===
${JSON.stringify(currentObjects.map(o => ({id: o.id, name: o.name, type: o.type})))}` + `

=== 当前选中物体 ===
${JSON.stringify(selectedObj ? {id: selectedObj.id, name: selectedObj.name, type: selectedObj.type} : null)}` + `

=== 图形属性字典 ===

【基础属性】
- id: 自动生成，无需指定
- name: 物体名称，字符串
- type: 物体类型，支持值：rect, circle, text, triangle, path
- x: 横坐标，数字，范围 0-800
- y: 纵坐标，数字，范围 0-600
- width: 宽度，数字，范围 10-200
- height: 高度，数字，范围 10-200
- fillColor: 填充颜色，十六进制格式，如 #ff0000
- behaviors: 行为数组，结构化格式如下：
  [
    {
      "id": "唯一标识符",
      "name": "行为名称",
      "action": "行为类型", // rotate, scale, move, fade, modify, collision
      "duration": 持续时间, // 秒
      "params": { 行为参数 },
      "targetId": "目标物体ID", // 仅当action为modify或collision时必填
      "createdAt": "创建时间", // ISO格式
      "createdBy": "创建者" // system, ai, user
    }
  ]

【形状特定属性】
- rect (矩形):
  - borderRadius: 圆角半径，数字，默认 8

- circle (圆形):
  - 使用 width 作为直径，height 被忽略

- text (文本):
  - text: 文本内容，字符串
  - fontSize: 字体大小，数字，范围 8-48

- triangle (三角形):
  - 自动根据 width 和 height 生成等边三角形

- path (路径):
  - path: SVG路径字符串，如 "M10,10 L50,50 L10,50 Z"
  - stroke: 描边颜色，十六进制格式，默认 #1e293b
  - strokeWidth: 描边宽度，数字，默认 4

=== 相对空间关系 ===

【相对位置定义】
当用户描述物体之间的相对位置时，使用 relativePosition 字段代替绝对坐标 position。

{
  "relativePosition": {
    "targetId": string, // 参考物体的ID
    "direction": "left" | "right" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "inside" | "outside",
    "offset": number // 距离参考物体的偏移量（像素），默认为 10
  }
}

【方向说明】
- "left": 在参考物体的左侧
- "right": 在参考物体的右侧
- "top": 在参考物体的上方
- "bottom": 在参考物体的下方
- "top-left": 在参考物体的左上方
- "top-right": 在参考物体的右上方
- "bottom-left": 在参考物体的左下方
- "bottom-right": 在参考物体的右下方
- "center": 在参考物体的中心（重叠）
- "inside": 在参考物体内部（用于嵌套）
- "outside": 在参考物体外部（默认偏移距离）

【使用规则】
1. 当用户描述相对位置时（如"在obj-1的右边"、"在红色方块下面"），优先使用 relativePosition
2. 当用户描述绝对位置时（如"在画布中间"、"在左上角"），使用 position
3. 不要同时使用 position 和 relativePosition
4. 如果无法确定参考物体，使用绝对坐标 position

=== 操作类型 ===

【创建物体 (CREATE)】
{
  "type": "CREATE",
  "shape": "rect" | "circle" | "text" | "triangle" | "path",
  "color": "#RRGGBB",
  "position": { // 绝对坐标，与 relativePosition 二选一
    "x": number,
    "y": number
  },
  "relativePosition": { // 相对坐标，与 position 二选一
    "targetId": string,
    "direction": "left" | "right" | "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "inside" | "outside",
    "offset": number
  },
  "size": {
    "width": number,
    "height": number
  },
  "text": string, // 仅text类型必填
  "fontSize": number, // 仅text类型必填
  "path": string, // 仅path类型必填
  "stroke": "#RRGGBB", // 仅path类型可选
  "strokeWidth": number, // 仅path类型可选
  "name": string,
  "behaviors": [行为数组] // 可选，定义物体的交互行为
}

【修改物体 (MODIFY)】
{
  "type": "MODIFY",
  "id": string, // 单一目标ID，与ids二选一
  "ids": ["obj-1", "obj-2"], // 多个目标ID数组，与id二选一
  "properties": {
    "position": {"x": number, "y": number}, // 可选
    "size": {"width": number, "height": number}, // 可选
    "color": "#RRGGBB", // 可选
    "text": string, // 仅text类型可选
    "fontSize": number, // 仅text类型可选
    "stroke": "#RRGGBB", // 仅path类型可选
    "strokeWidth": number // 仅path类型可选
  }
}

【动画物体 (ANIMATE)】
{
  "type": "ANIMATE",
  "id": string, // 单一目标ID，与ids二选一
  "ids": ["obj-1", "obj-2"], // 多个目标ID数组，与id二选一
  "action": "rotate" | "scale" | "move" | "fade",
  "duration": number, // 0.5-5秒
  "params": {
    "rotation": number, // 仅rotate必填，0-360度
    "scale": number, // 仅scale必填，0.1-2.0
    "moveTo": {"x": number, "y": number}, // 仅move必填
    "opacity": number // 仅fade必填，0-1
  }
}

【删除物体 (DELETE)】
{
  "type": "DELETE",
  "id": string, // 单一目标ID，与ids二选一
  "ids": ["obj-1", "obj-2"] // 多个目标ID数组，与id二选一
}

=== 重要规则 ===
1. 所有坐标和尺寸必须在指定范围内
2. 颜色必须是有效的十六进制格式 (#RRGGBB 或 #RGB)
3. 必须使用当前物体列表中存在的ID进行修改、动画或删除
4. 对于text类型，text和fontSize字段是必填的
5. 对于path类型，path字段是必填的
6. 确保返回的JSON格式正确，可被JSON.parse()解析
7. 不要添加任何额外的注释或解释文本
8. 当用户使用代词如"它"、"这个"、"那个"时，通常指的是当前选中的物体或最近创建的物体
9. 当用户要求创建交互时，使用behaviors数组定义交互逻辑，特别是使用action为"modify"来修改其他物体的属性

=== 详细示例 ===

示例1：创建红色正方形
用户输入："创建一个红色的正方形在中间位置"
返回：{"type":"CREATE","shape":"rect","color":"#ff0000","position":{"x":400,"y":300},"size":{"width":100,"height":100},"name":"Red_Square"}

示例2：创建蓝色圆形
用户输入："创建一个蓝色的圆形在右上角"
返回：{"type":"CREATE","shape":"circle","color":"#0000ff","position":{"x":600,"y":100},"size":{"width":80,"height":80},"name":"Blue_Circle"}

示例3：修改物体（使用代词）
用户输入："创建一个黄色的正方形"
返回：{"type":"CREATE","shape":"rect","color":"#ffff00","position":{"x":400,"y":300},"size":{"width":100,"height":100},"name":"Yellow_Square"}
用户输入："把它变大"
返回：{"type":"MODIFY","id":"obj-123","properties":{"size":{"width":150,"height":150}}}

示例3a：相对位置创建
用户输入："在红色方块右边创建一个蓝色圆形"
返回：{"type":"CREATE","shape":"circle","color":"#0000ff","relativePosition":{"targetId":"Red_Square","direction":"right","offset":20},"size":{"width":80,"height":80},"name":"Blue_Circle_Right"}

示例3b：相对位置创建（带偏移）
用户输入："在obj-1的下方10像素处创建一个绿色三角形"
返回：{"type":"CREATE","shape":"triangle","color":"#00ff00","relativePosition":{"targetId":"obj-1","direction":"bottom","offset":10},"size":{"width":60,"height":60},"name":"Green_Triangle_Below"}

示例3c：对角线相对位置
用户输入："在蓝色圆形的右上方创建一个黄色文本"
返回：{"type":"CREATE","shape":"text","color":"#ffff00","relativePosition":{"targetId":"Blue_Circle","direction":"top-right","offset":15},"size":{"width":120,"height":40},"text":"Hello","fontSize":16,"name":"Yellow_Text_TR"}

示例4：创建交互
用户输入："创建一个红色的正方形，点击它时让那个叫 Title_Text 的文字变绿。"
返回：{"type":"CREATE","shape":"rect","color":"#ff0000","position":{"x":400,"y":300},"size":{"width":100,"height":100},"name":"Red_Square","behaviors":[{"id":"bh-123","name":"点击变色","action":"modify","duration":0.5,"params":{"color":"#00ff00"},"targetId":"obj-2","createdAt":"2024-01-01T00:00:00Z","createdBy":"ai"}]}

示例5：创建碰撞交互
用户输入："创建一个蓝色的圆形，当它碰到 obj-1 时，让 obj-1 变成红色。"
返回：{"type":"CREATE","shape":"circle","color":"#0000ff","position":{"x":200,"y":200},"size":{"width":80,"height":80},"name":"Blue_Circle","behaviors":[{"id":"bh-456","name":"碰撞变色","action":"collision","duration":0.5,"params":{"color":"#ff0000"},"targetId":"obj-1","createdAt":"2024-01-01T00:00:00Z","createdBy":"ai"}]}

示例6：动画物体
用户输入："让obj-1旋转"
返回：{"type":"ANIMATE","id":"obj-1","action":"rotate","duration":1.0,"params":{"rotation":360}}

示例7：删除物体
用户输入："删除obj-3"
返回：{"type":"DELETE","id":"obj-3"}

示例8：多目标修改
用户输入："让所有的方块变成绿色"
返回：{"type":"MODIFY","ids":["Red_Square","obj-123","obj-456"],"properties":{"color":"#00ff00"}}

示例9：多目标删除
用户输入："删除所有的圆形"
返回：{"type":"DELETE","ids":["Blue_Circle","obj-789"]}

示例10：多目标动画
用户输入："让它们旋转"
返回：{"type":"ANIMATE","ids":["Red_Square","Blue_Circle"],"action":"rotate","duration":1.0,"params":{"rotation":360}}

=== 四大原语体系 ===

【事件原语】

1. onDrag (拖拽事件)
当用户拖拽物体时触发的行为：
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

2. onHover (悬停事件)
当鼠标悬停在物体上时触发的行为：
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

3. onHoverOut (悬停退出事件)
当鼠标离开物体时触发的行为：
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

4. onTimer (定时器事件)
定期执行的行为：
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

【逻辑原语】

1. if (条件判断)
根据条件执行不同的行为：
{
  "action": "if",
  "params": {
    "condition": "isColliding|isSelected|equals(prop,value)",
    "then": [
      {
        "action": "modify|rotate|scale|fade",
        "params": {...}
      }
    ],
    "else": [
      {
        "action": "modify|rotate|scale|fade",
        "params": {...}
      }
    ]
  }
}

2. repeat (重复执行)
重复执行一组行为：
{
  "action": "repeat",
  "params": {
    "count": 3,
    "delay": 100,
    "actions": [
      {
        "action": "modify|rotate|scale|fade",
        "params": {...},
        "duration": 1000
      }
    ]
  }
}

3. wait (等待延迟)
等待指定时间：
{
  "action": "wait",
  "params": {
    "duration": 1000
  }
}

4. while (循环执行)
在条件满足时循环执行：
{
  "action": "while",
  "params": {
    "condition": "isColliding|isSelected",
    "interval": 100,
    "actions": [
      {
        "action": "modify|rotate|scale|fade",
        "params": {...}
      }
    ]
  }
}

5. foreach (遍历执行)
遍历列表并执行行为：
{
  "action": "foreach",
  "params": {
    "items": ["obj-1", "obj-2", "obj-3"],
    "action": {
      "action": "modify|rotate|scale|fade",
      "params": {...}
    }
  }
}

6. call (调用行为)
调用其他物体的行为：
{
  "action": "call",
  "params": {
    "targetId": "目标物体ID",
    "actionName": "行为名称"
  }
}

7. sequence (顺序执行)
按顺序执行一组行为：
{
  "action": "sequence",
  "params": {
    "actions": [
      {
        "action": "modify|rotate|scale|fade",
        "params": {...},
        "duration": 1000
      }
    ]
  }
}

8. parallel (并行执行)
并行执行一组行为：
{
  "action": "parallel",
  "params": {
    "actions": [
      {
        "action": "modify|rotate|scale|fade",
        "params": {...},
        "duration": 1000
      }
    ]
  }
}

【复合行为示例】

示例11：闪烁效果（使用repeat和wait）
用户输入："让obj-1闪烁3次"
返回：{"type":"CREATE","shape":"rect","color":"#ff0000","position":{"x":400,"y":300},"size":{"width":100,"height":100},"name":"Blinking_Square","behaviors":[{"id":"bh-001","name":"闪烁","action":"repeat","params":{"count":3,"delay":200,"actions":[{"action":"fade","params":{"opacity":0},"duration":100},{"action":"wait","params":{"duration":100}},{"action":"fade","params":{"opacity":1},"duration":100}]}]}]}

示例12：碰撞后闪烁（使用if和repeat）
用户输入："创建一个圆形，当它碰到obj-1时，让obj-1闪烁3次"
返回：{"type":"CREATE","shape":"circle","color":"#0000ff","position":{"x":200,"y":200},"size":{"width":80,"height":80},"name":"Blue_Circle","behaviors":[{"id":"bh-002","name":"碰撞闪烁","action":"collision","params":{"color":"#ff0000"},"targetId":"obj-1","createdAt":"2024-01-01T00:00:00Z","createdBy":"ai"}]}

示例13：定时器动画（使用timer）
用户输入："创建一个每秒旋转30度的箭头"
返回：{"type":"CREATE","shape":"triangle","color":"#ff0000","position":{"x":400,"y":300},"size":{"width":50,"height":50},"name":"Rotating_Arrow","behaviors":[{"id":"bh-003","name":"定时旋转","action":"timer","params":{"interval":1000,"actions":[{"action":"rotate","params":{"rotation":30},"duration":1000}]}}]}

示例14：悬停效果（使用hover）
用户输入："创建一个矩形，鼠标悬停时变大，离开时恢复"
返回：{"type":"CREATE","shape":"rect","color":"#00ff00","position":{"x":400,"y":300},"size":{"width":100,"height":100},"name":"Hover_Rect","behaviors":[{"id":"bh-004","name":"悬停变大","action":"hover","params":{"onHover":{"targetId":"Hover_Rect","action":{"action":"scale","params":{"scale":1.5},"duration":300}}},"createdAt":"2024-01-01T00:00:00Z","createdBy":"ai"},{"id":"bh-005","name":"悬停恢复","action":"hoverOut","params":{"onHoverOut":{"targetId":"Hover_Rect","action":{"action":"scale","params":{"scale":1.0},"duration":300}}},"createdAt":"2024-01-01T00:00:00Z","createdBy":"ai"}]}

示例15：顺序动画（使用sequence）
用户输入："创建一个先变红再变蓝的正方形"
返回：{"type":"CREATE","shape":"rect","color":"#3862f6","position":{"x":400,"y":300},"size":{"width":100,"height":100},"name":"Color_Change","behaviors":[{"id":"bh-006","name":"颜色变化","action":"sequence","params":{"actions":[{"action":"modify","params":{"color":"#ff0000"},"duration":500},{"action":"wait","params":{"duration":500}},{"action":"modify","params":{"color":"#0000ff"},"duration":500}]}}]}

示例16：并行动画（使用parallel）
用户输入："创建一个同时旋转和缩放的圆形"
返回：{"type":"CREATE","shape":"circle","color":"#0000ff","position":{"x":400,"y":300},"size":{"width":80,"height":80},"name":"Parallel_Anim","behaviors":[{"id":"bh-007","name":"并行动画","action":"parallel","params":{"actions":[{"action":"rotate","params":{"rotation":360},"duration":2000},{"action":"scale","params":{"scale":1.5},"duration":2000}]}}]}

示例17：条件判断（使用if）
用户输入："创建一个矩形，如果碰撞则变红，否则保持蓝色"
返回：{"type":"CREATE","shape":"rect","color":"#0000ff","position":{"x":400,"y":300},"size":{"width":100,"height":100},"name":"Conditional_Rect","behaviors":[{"id":"bh-008","name":"条件变色","action":"if","params":{"condition":"isColliding","then":[{"action":"modify","params":{"color":"#ff0000"},"duration":500}],"else":[{"action":"modify","params":{"color":"#0000ff"},"duration":500}]}}]}

示例18：循环检测（使用while）
用户输入："创建一个圆形，当它被选中时持续旋转"
返回：{"type":"CREATE","shape":"circle","color":"#ff0000","position":{"x":400,"y":300},"size":{"width":80,"height":80},"name":"While_Rotate","behaviors":[{"id":"bh-009","name":"选中旋转","action":"while","params":{"condition":"isSelected","interval":50,"actions":[{"action":"rotate","params":{"rotation":10},"duration":50}]}}]}

示例19：拖拽触发（使用drag）
用户输入："创建一个矩形，拖拽时让obj-1变绿"
返回：{"type":"CREATE","shape":"rect","color":"#3862f6","position":{"x":400,"y":300},"size":{"width":100,"height":100},"name":"Drag_Trigger","behaviors":[{"id":"bh-010","name":"拖拽触发","action":"drag","params":{"onDrag":{"targetId":"obj-1","action":{"action":"modify","params":{"color":"#00ff00"},"duration":500}}}}]}

示例20：遍历操作（使用foreach）
用户输入："让所有的方块同时变大"
返回：{"type":"ANIMATE","ids":["Red_Square","Yellow_Square"],"action":"foreach","params":{"items":["Red_Square","Yellow_Square"],"action":{"action":"scale","params":{"scale":1.5},"duration":500}}}`;

  // 构建消息数组，包含系统提示、历史对话和当前输入
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userInput }
  ];

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        response_format: { type: "json_object" }
      })
    });

    const resData = await response.json();
    const aiResponse = resData.choices[0].message.content;
    
    // 更新对话历史
    conversationHistory.push({ role: "user", content: userInput });
    conversationHistory.push({ role: "assistant", content: aiResponse });
    
    // 限制对话历史长度，避免过长
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }
    
    // 记录训练数据（用于优化系统提示词）
    logTrainingData(userInput, aiResponse, {
      currentObjects: currentObjects,
      selectedObj: selectedObj
    });
    
    return JSON.parse(aiResponse);
  } catch (error) {
    console.error('AI API Error:', error);
    return { type: 'CREATE', shape: 'rect', color: '#3862f6' };
  }
};

export default function App() {
  const [objects, setObjects] = useState(INITIAL_OBJECTS);
  const [selectedId, setSelectedId] = useState(INITIAL_OBJECTS[0].id);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('edit');
  const [activeTool, setActiveTool] = useState('select');
  const [activeTab, setActiveTab] = useState('canvas');

  const handleAddCustomObject = () => {
    const newId = `obj-${Date.now()}`;
    const newObj = {
      id: newId,
      name: `Custom_${objects.length + 1}`,
      type: 'rect',
      x: 50 + Math.random() * 100, 
      y: 50 + Math.random() * 100,
      width: 60, height: 60,
      fillColor: '#8b5cf6',
      borderRadius: 8,
      behaviors: []
    };
    setObjects([...objects, newObj]);
    setActiveTool('select');
    handleSelect(newId);
  };

  const selectedObj = objects.find(o => o.id === selectedId);

  const deleteObject = (id) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    setSelectedId(null);
  };

  const handleSelect = (id) => {
    if (mode !== 'edit') return;
    setSelectedId(id);
    if (canvasManager) {
      canvasManager.setActiveObjectById(id);
    }
  };

  const updateObject = useCallback((id, updates) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, []);

  const { manager: canvasManager, canvasRef } = useCanvas(objects, setObjects, mode, setSelectedId);

  useEffect(() => {
    if (canvasManager) {
      canvasManager.setTool(activeTool);
    }
  }, [activeTool, canvasManager]);

  const handleAICommand = async (cmd) => {
    if (!cmd.trim()) return;
    try {
      const result = await askAI(cmd, objects, selectedObj);
      if (result.type === 'CREATE') {
        const newId = `obj-${Date.now()}`;
        
        // 确保尺寸在合理范围内
        const width = Math.max(10, Math.min(200, result.size?.width || 60));
        const height = Math.max(10, Math.min(200, result.size?.height || 60));
        
        // 处理位置：优先使用相对位置，其次使用绝对位置，最后使用随机位置
        let x, y;
        
        if (result.relativePosition && result.relativePosition.targetId) {
          // 使用相对位置
          const targetObj = objects.find(o => o.id === result.relativePosition.targetId);
          if (targetObj) {
            const relativePos = calculateRelativePosition(
              result.relativePosition,
              targetObj,
              { width, height }
            );
            if (relativePos) {
              x = relativePos.x;
              y = relativePos.y;
            } else {
              // 相对位置计算失败，使用默认位置
              x = Math.max(0, Math.min(750, result.position?.x || 50 + Math.random() * 100));
              y = Math.max(0, Math.min(550, result.position?.y || 50 + Math.random() * 100));
            }
          } else {
            // 参考物体不存在，使用默认位置
            x = Math.max(0, Math.min(750, result.position?.x || 50 + Math.random() * 100));
            y = Math.max(0, Math.min(550, result.position?.y || 50 + Math.random() * 100));
          }
        } else if (result.position) {
          // 使用绝对位置
          x = Math.max(0, Math.min(750, result.position.x));
          y = Math.max(0, Math.min(550, result.position.y));
        } else {
          // 使用随机位置
          x = 50 + Math.random() * 100;
          y = 50 + Math.random() * 100;
        }
        
        // 校验颜色格式
        const validColor = validateColor(result.color);
        const validStroke = validateColor(result.stroke);
        
        const newObj = {
          id: newId,
          name: result.name || `${result.shape || 'rect'}_${objects.length + 1}`,
          type: result.shape || 'rect',
          x: x,
          y: y,
          width: width,
          height: height,
          fillColor: validColor,
          borderRadius: result.borderRadius || 8,
          text: result.text || '',
          fontSize: Math.max(8, Math.min(48, result.fontSize || 16)),
          path: result.path || '', // 支持path类型
          stroke: validStroke || '#1e293b',
          strokeWidth: Math.max(1, Math.min(20, result.strokeWidth || 4)),
          behaviors: [
            {
              id: `bh-${Date.now()}`,
              name: '创建物体',
              action: 'scale',
              duration: 0.5,
              params: { scale: 1.1 },
              createdAt: new Date().toISOString(),
              createdBy: 'ai'
            }
          ]
        };
        
        setObjects([...objects, newObj]);
        setSelectedId(newId);
        
        // 添加创建动画效果
        setTimeout(() => {
          const ts = Date.now();
          updateObject(newId, {
            behaviors: [{ 
              id: `bh-${ts}`, 
              name: '创建动画',
              action: 'scale',
              duration: 0.5,
              params: { scale: 1.2 }
            }]
          });
        }, 100);
        
        // 添加视觉反馈
        if (isMobile) {
          const shapeName = result.shape === 'rect' ? '正方形' : 
                          result.shape === 'circle' ? '圆形' : 
                          result.shape === 'text' ? '文本' : 
                          result.shape === 'triangle' ? '三角形' :
                          result.shape === 'path' ? '路径' : '图形';
          alert(`AI 已成功绘制一个${validColor}的${shapeName}`);
        }
      } else if (result.type === 'MODIFY') {
        const targetIds = result.ids || (result.id ? [result.id] : []);
        if (targetIds.length > 0 && result.properties) {
          const properties = {};
          
          // 处理位置更新
          if (result.properties.position) {
            properties.x = Math.max(0, Math.min(750, result.properties.position.x));
            properties.y = Math.max(0, Math.min(550, result.properties.position.y));
          }
          
          // 处理尺寸更新
          if (result.properties.size) {
            properties.width = Math.max(10, Math.min(200, result.properties.size.width));
            properties.height = Math.max(10, Math.min(200, result.properties.size.height));
          }
          
          // 处理颜色更新，添加颜色校验
          if (result.properties.color) {
            properties.fillColor = validateColor(result.properties.color);
          }
          
          // 处理描边属性
          if (result.properties.stroke) {
            properties.stroke = validateColor(result.properties.stroke);
          }
          if (result.properties.strokeWidth) {
            properties.strokeWidth = Math.max(1, Math.min(20, result.properties.strokeWidth));
          }
          
          // 处理其他属性
          if (result.properties.text) {
            properties.text = result.properties.text;
          }
          if (result.properties.fontSize) {
            properties.fontSize = Math.max(8, Math.min(48, result.properties.fontSize));
          }
          if (result.properties.borderRadius) {
            properties.borderRadius = Math.max(0, Math.min(50, result.properties.borderRadius));
          }
          
          // 对所有目标物体应用修改
          targetIds.forEach(id => {
            updateObject(id, properties);
          });
        }
      } else if (result.type === 'ANIMATE') {
        const targetIds = result.ids || (result.id ? [result.id] : []);
        if (targetIds.length > 0 && result.action && result.params) {
          const ts = Date.now();
          let behaviorName = `点击${result.action}`;
          
          // 根据不同的动画类型构建更详细的行为名称
          switch (result.action) {
            case 'rotate':
              behaviorName = `旋转${result.params.rotation || 360}度`;
              break;
            case 'scale':
              behaviorName = `缩放${result.params.scale || 1.5}倍`;
              break;
            case 'move':
              if (result.params.moveTo) {
                behaviorName = `移动到(${result.params.moveTo.x}, ${result.params.moveTo.y})`;
              }
              break;
            case 'fade':
              behaviorName = `透明度变为${result.params.opacity || 0.5}`;
              break;
          }
          
          // 对所有目标物体应用动画
          targetIds.forEach(id => {
            updateObject(id, {
              behaviors: [{ 
                id: `bh-${ts}-${id}`, 
                name: behaviorName,
                action: result.action,
                duration: Math.max(0.5, Math.min(5, result.duration || 1)),
                params: result.params,
                createdAt: new Date().toISOString(),
                createdBy: 'ai'
              }]
            });
          });
        }
      } else if (result.type === 'DELETE') {
        const targetIds = result.ids || (result.id ? [result.id] : []);
        if (targetIds.length > 0) {
          targetIds.forEach(id => {
            deleteObject(id);
          });
        }
      }
      setInput('');
    } catch (error) {
      alert("AI 响应失败，请检查网络");
    }
  };

  const handleClearCanvas = () => {
    setObjects(INITIAL_OBJECTS);
    setSelectedId(INITIAL_OBJECTS[0].id);
  };

  if (isMobile) {
    return (
      <View style={styles.mobileContainer}>
        <Header mode={mode} setMode={setMode} setActiveTool={setActiveTool} />
        
        <View style={styles.mobileTabBar}>
          <TouchableOpacity 
            style={[styles.mobileTab, activeTab === 'objects' && styles.mobileTabActive]}
            onPress={() => setActiveTab('objects')}
          >
            <Text style={[styles.mobileTabText, activeTab === 'objects' && styles.mobileTabTextActive]}>对象</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mobileTab, activeTab === 'canvas' && styles.mobileTabActive]}
            onPress={() => setActiveTab('canvas')}
          >
            <Text style={[styles.mobileTabText, activeTab === 'canvas' && styles.mobileTabTextActive]}>画布</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mobileTab, activeTab === 'properties' && styles.mobileTabActive]}
            onPress={() => setActiveTab('properties')}
          >
            <Text style={[styles.mobileTabText, activeTab === 'properties' && styles.mobileTabTextActive]}>属性</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mobileContent}>
          {activeTab === 'objects' && (
            <ObjectList objects={objects} selectedId={selectedId} handleSelect={handleSelect} mode={mode} />
          )}
          
          {activeTab === 'canvas' && (
            <View style={styles.mobileCanvasContainer}>
              <View style={styles.mobileToolbarWrapper}>
                <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} onAddObject={handleAddCustomObject} mode={mode} />
                {mode === 'edit' && (
                  <TouchableOpacity 
                    onPress={handleClearCanvas}
                    style={styles.mobileClearButton}
                  >
                    <Trash2 size={16} color="#dc2626" />
                    <Text style={styles.mobileClearButtonText}>清空</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.mobileCanvasWrapper}>
                <CanvasRenderer 
                  objects={objects} 
                  mode={mode} 
                  canvasRef={canvasRef} 
                  onSelect={setSelectedId} 
                  onModify={updateObject} 
                  onDelete={deleteObject}
                />
              </View>

              <View style={styles.mobileStatusBar}>
                <View style={[styles.statusDot, { backgroundColor: mode === 'play' ? '#3b82f6' : '#94a3b8' }]} />
                <Text style={styles.statusText}>
                  {mode === 'play' ? '预览模式' : '编辑模式'}
                </Text>
              </View>
            </View>
          )}
          
          {activeTab === 'properties' && (
            <PropertyPanel selectedObj={selectedObj} selectedId={selectedId} updateObject={updateObject} onDelete={deleteObject} mode={mode} />
          )}
        </View>
        
        <AiChatFooter input={input} setInput={setInput} handleAICommand={handleAICommand} />
      </View>
    );
  }

  // Web端布局 - 优化布局避免重叠
  return (
    <View style={styles.container}>
      <Header mode={mode} setMode={setMode} setActiveTool={setActiveTool} />

      <View style={styles.mainContent}>
        {/* 左侧对象列表 */}
        <View style={styles.leftSidebar}>
          <ObjectList objects={objects} selectedId={selectedId} handleSelect={handleSelect} mode={mode} />
        </View>

        {/* 中间画布区域 */}
        <View style={styles.centerArea}>
          <View style={styles.canvasContainer}>
            {/* 顶部工具栏 */}
            <View style={styles.toolbarWrapper}>
              <Toolbar activeTool={activeTool} setActiveTool={setActiveTool} onAddObject={handleAddCustomObject} mode={mode} />
              
              {mode === 'edit' && (
                <TouchableOpacity 
                  onPress={handleClearCanvas}
                  style={styles.clearButton}
                >
                  <Trash2 size={14} color="#dc2626" />
                  <Text style={styles.clearButtonText}>清空画布</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 画布内容 */}
            <View style={styles.canvasWrapper}>
              {Platform.OS === 'web' && (
                <View style={styles.webGrid} />
              )}
              
              <CanvasRenderer 
                objects={objects} 
                mode={mode} 
                canvasRef={canvasRef} 
                onSelect={setSelectedId} 
                onModify={updateObject} 
                onDelete={deleteObject}
              />
            </View>

            {/* 底部状态栏 */}
            <View style={styles.statusBar}>
              <View style={[styles.statusDot, { backgroundColor: mode === 'play' ? '#3b82f6' : '#94a3b8' }]} />
              <Text style={styles.statusText}>
                {mode === 'play' ? 'INTERACTIVE PREVIEW' : 'DESIGN MODE'}
              </Text>
            </View>
          </View>
        </View>

        {/* 右侧属性面板 */}
        <View style={styles.rightSidebar}>
          <PropertyPanel selectedObj={selectedObj} selectedId={selectedId} updateObject={updateObject} onDelete={deleteObject} mode={mode} />
        </View>
      </View>
      
      <AiChatFooter input={input} setInput={setInput} handleAICommand={handleAICommand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fcfcfc',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  
  // Web端布局
  leftSidebar: {
    width: 220,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
    })
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasContainer: {
    width: '100%',
    maxWidth: 900,
    height: '100%',
    maxHeight: 650,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    ...Platform.select({
      web: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }
    })
  },
  toolbarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  canvasWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f8f9fa',
  },
  webGrid: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0.03,
    backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    pointerEvents: 'none',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  rightSidebar: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
    })
  },
  
  // Mobile styles
  mobileContainer: {
    flex: 1,
    backgroundColor: '#fcfcfc',
  },
  mobileTabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    height: 44,
  },
  mobileTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mobileTabActive: {
    borderBottomColor: '#3b82f6',
  },
  mobileTabText: {
    fontSize: 14,
    color: '#64748b',
  },
  mobileTabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  mobileContent: {
    flex: 1,
  },
  mobileCanvasContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 10,
  },
  mobileToolbarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mobileCanvasWrapper: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  mobileStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
  },
  mobileClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  mobileClearButtonText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
});

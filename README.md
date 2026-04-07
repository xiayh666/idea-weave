# Idea Weave 行为树协作平台

## 1. 项目概览

Idea Weave 是基于 Expo 构建的交互画布，用户可以以自然语句描述行为，它会把语义转换成
行为树（Behavior Tree）并直接挂载到画布物体上。行为树由触发器、控制流节点、条件和动作组成，
通过 `src/core/BTEngine.jsx` 解析、调度并驱动 `canvasManager` API。沿用本 README 的方式可以让更强
的 AI 快速理解系统边界。

## 2. 快速启动

1. 安装依赖

   ```bash
   npm install
   ```

2. 启动项目

   ```bash
   npx expo start
   ```

项目输出里会提供 development build、模拟器或 Expo Go 的入口。

## 3. 行为树能力速览

### 3.1 触发器（Trigger）

- `onClick`：点击物体。
- `onDragStart` / `onDrag` / `onDragEnd`：拖拽过程中及释放。
- `onHover` / `onHoverOut`：移动进入/离开。
- `onTimer`：定时器，`triggerParams.interval` 控制周期。
- `onSlingshotDrop`：弹弓底座上释放后的特殊触发。

### 3.2 控制流节点

- `sequence`：依次执行孩子节点，遇到失败立即结束。
- `selector`：按顺序尝试，每个成功即可终止。
- `parallel`：并行运行所有孩子，任何失败导致整体失败。
- `repeat`：重复一个子树，可配置次数或无穷。
- `foreach`：遍历 `params.targetIds` 列表，每次作用在当前迭代目标。
- `inside`：收集与当前物体重叠的对象列表，只在收集到目标时才执行孩子节点一次。

### 3.3 条件节点

- `isColliding`：与指定 `targetId` 或 `targetName` 相交。
- `isSelected`：是否被选中。
- `equals`：比较上下文字段（如 `behaviorMeta.event`）与给定值。
- `isOverlapping`：矩形重叠（基于 `getBounds`）。

### 3.4 动作节点（Action）

- `modify`：直接设置颜色/透明度/文本。同步执行。
- `move`：可指定 `dx`/`dy` 或 `moveTo`。支持动画 `duration`。
- `scale`：设置缩放，支持动画。
- `rotate`：设置角度或过渡。
- `fade`：通过透明度动画渐变。
- `wait`：仅用于暂停，不驱动渲染。
- `launch`：核心弹射逻辑，根据释放点 `dragStart`/`dragEnd` 或 `useDragVector` 计算力，支持 `duration`、`spin`、`maxForce`。
- `colorInside`：扫描 `canvas`，将与当前物体相交的目标染色，可限制 `targetIds`。
- `call`：触发 `canvasManager` 的回调函数（例如 `nextLevel`、`gameOver`）。

### 3.5 运行机制

- `BTStatus`：节点返回 `RUNNING`、`SUCCESS`、`FAILURE`。
- `BTEngine` 在 `requestAnimationFrame` 循环中调用 `tickAll`，成功或失败的树会被销毁。
- `startTimerForBehavior` 会为 `onTimer` 触发定时注册 `setInterval`，`onTimer` 停用时自动清理。
- 每次 `ActionNode` 执行后都会调用 `canvas.requestRenderAll`，并使用 `syncObjectState` 回流位置/角度等信息。
- 拖拽过程中会维护 `dragStartPositions`、`dragVector`、`slingshot` 判断，释放时通过 `handleTriggerEvent('onSlingshotDrop', …)` 传给行为树。

## 4. JSON 语义参考

每个物体 JSON 的基本字段如下（参考 `src/app/constants/initialObjects.js`）：

- `op`: 操作类型，通常为 `CREATE`。
- `data`: 内部包含一个对象的定义。
- `type`: 形状 (`rect`、`circle`、`triangle`、`text`...)。
- `id`/`name`: 唯一标识符。
- `fillColor`/`strokeColor`: 颜色。
- `x`, `y`, `width`, `height`, `radius`, `angle`, `opacity`, `scaleX`, `scaleY`: 变换属性。
- `behaviors`: 行为列表，每一项包含 `trigger` + `behaviorTree`。

`behaviorTree` 中遵循 `node`-`children` 或 `child` 的嵌套结构，`action` 节点在 `params` 中携带动作参数（如 `dx`、`color`、`duration`）。

## 5. 数据集编写指南

数据集文件（例如 `src/server/dataset3.jsonl`、`behavior_dataset.jsonl`）采用 JSON Lines，每行包含：

```
{
  "instruction": "中文自然语言描述",
  "output": "{\"op\": \"CREATE\", \"data\": { ... }}"
}
```

- `instruction` 必须用中文，避免“设计模式”、“弹丸”、“这个”等指代语，直接陈述要做的事情（例如“点击绿色正方形让它变红”）。
- `output` 必须是合法 JSON 字符串，通常以 `CREATE` 为 `op`，内部的 `data` 描述具体对象与行为。
- 行为部分直接写明 `trigger`、`behaviorTree`、`action`、`params`，不需要解释机制。
- 可参考 `src/server/dataset3.jsonl`：每条示例都写出了要添加的对象与行为，动作可以包含 `sequence`、`repeat`、`selector`、`parallel`、`condition` 等节点。
- 避免写模糊的参考，例如“那个形状”或“之后再做”，要精确定位对象 ID/name。

## 6. 拖拽与弹射要点

- 任何触发 `onDrag`/`onDragEnd` 的行为都在交互模式 (`canvasManager.mode === 'play'`) 下才会执行。
- 弹射 (`launch`): 采样 `behaviorMeta.dragStart`/`dragEnd`，向量方向由释放点减去起始点，向量被放大到 `maxForce`，默认会对目标执行动画而不是瞬移。
- 若要直接控制释放方向，可设置 `params.useReleaseVector`、`params.dragMultiplier`，或者预先传入 `params.dx`/`params.dy`。
- `onSlingshotDrop` 允许以底座为触发点，在进入底座后触发专属行为（比如将放进去的物体变成红色、发射其他对象）。

## 7. 参考资料

- 核心行为代码：`src/core/BTEngine.jsx`
- 行为原语指南：`PRIMITIVES_GUIDE.md`
- 初始数据：`src/app/constants/initialObjects.js`
- 数据集样例：`src/server/dataset3.jsonl`、`src/server/behavior_dataset.jsonl`

结合以上内容可以让更强的 AI 在理解触发器、行为树结构、动作调度、数据集格式后，快速为 Idea Weave 生成新的交互场景。

## 8. 应用结构

Idea Weave 项目采用模块化架构，主要分为前端应用和后端服务器两部分。以下是项目的主要结构：

### 8.1 根目录结构
- `app.json` / `expo-env.d.ts` / `metro.config.js` / `package.json` / `tsconfig.json`：Expo 项目配置和依赖管理。
- `assets/`：应用资源文件，包括图标和图片。
- `IdeaWeave/`：独立的 Expo 子应用目录，包含自己的 `App.tsx` 和配置。
- `src/`：主要源代码目录。

### 8.2 src/ 目录结构
- `app/`：应用页面和布局。
  - `_layout.tsx`：主布局文件。
  - `index.jsx` / `index_style.jsx`：首页组件和样式。
  - `constants/`：常量定义，如 `initialObjects.js`。
  - `layouts/`：不同设备的布局组件（`DesktopWorkspace.jsx`、`MobileWorkspace.jsx`）。
- `components/`：可复用组件。
  - `AiChatFooter.jsx`：AI 聊天底部组件。
  - `Header.jsx`：头部组件。
  - `ObjectList.jsx`：对象列表组件。
  - `PropertyPanel.jsx`：属性面板组件。
  - `Toolbar.jsx`：工具栏组件。
- `core/`：核心业务逻辑。
  - `agent.jsx` / `agent_deepseek.jsx`：AI 代理相关。
  - `BTEngine.jsx`：行为树引擎。
  - `canvasManager.jsx` / `CanvasManagerNative.jsx`：画布管理器。
  - `TaskParser.jsx`：任务解析器。
- `hooks/`：自定义 React Hooks。
  - `useCanvas.jsx`：画布相关 Hook。
- `server/`：后端服务器代码。
  - `server.py`：FastAPI 服务器主文件。
  - `train.py` / `ui.py` / `mergeLoRA.py` / `qwen2.5-1.5BwithLoRA.py`：训练和模型相关脚本。
  - `config.json`：服务器配置。
  - `dataset3.jsonl` / `dataset4.jsonl`：训练数据集。
  - `lora_adapter/` / `merged_model/` / `models/` / `outputs/`：模型文件和输出。
- `utils/`：工具函数。
  - `trainingDataLogger.js` / `utils.js`：日志和通用工具。

## 9. 开发环境设计
### 9.1 系统要求
- **操作系统**：Windows 10/11、macOS 或 Linux。
- **Node.js**：版本 18.x 或更高（推荐使用 LTS 版本）。
- **Python**：版本 3.8 或更高（推荐 3.10+）。
- **Expo CLI**：全局安装。
- **Git**：版本控制工具。

### 9.2 前端开发环境设置
1. **安装 Node.js 和 npm**：
   ```bash
   # 下载并安装 Node.js 从 https://nodejs.org/
   node --version  # 验证安装
   npm --version   # 验证安装
   ```

2. **安装 Expo CLI**：
   ```bash
   npm install -g @expo/cli
   expo --version  # 验证安装
   ```

3. **克隆项目并安装依赖**：
   ```bash
   git clone <repository-url>
   cd idea-weave
   npm install
   ```

4. **启动开发服务器**：
   ```bash
   npx expo start
   ```
   这将启动 Expo 开发服务器，支持在模拟器、Expo Go 或浏览器中运行应用。

### 9.3 后端开发环境设置
1. **安装 Python 和 pip**：
   ```bash
   # 下载并安装 Python 从 https://python.org/
   python --version  # 验证安装
   pip --version     # 验证安装
   ```

2. **创建虚拟环境**（推荐）：
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```

3. **安装 Python 依赖**：
   首先创建 `requirements.txt`：
   ```
   fastapi==0.104.1
   uvicorn[standard]==0.24.0
   torch==2.1.0
   transformers==4.35.0
   peft==0.6.0
   accelerate==0.24.0
   pydantic==2.5.0
   python-multipart==0.0.6
   ```
   然后安装：
   ```bash
   pip install -r requirements.txt
   ```

4. **GPU 支持（可选）**：
   如果有 NVIDIA GPU，安装 CUDA 版本的 PyTorch：
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

### 9.4 模型和数据准备
1. **下载预训练模型**：
   确保 `src/server/models/Qwen2.5-1.5B-Instruct/` 目录包含必要的模型文件。

2. **LoRA 适配器**：
   确保 `src/server/lora_adapter/` 目录包含训练好的 LoRA 权重。


### 9.5 启动服务器
```bash
cd src/server
python server.py
```
服务器将在默认端口（通常 8000）启动，提供 API 接口。

### 9.6 开发工作流
1. **前端开发**：修改 `src/` 下的 React 组件，使用 Expo 热重载。
2. **后端开发**：修改 `src/server/` 下的 Python 脚本，重启服务器测试。
3. **模型训练**：使用 `training_data/fine_tuning_script.py` 进行模型微调。
4. **测试**：在不同设备上测试应用，确保行为树逻辑正确。

### 9.7 常见问题
- **端口冲突**：确保 8000 端口未被占用。
- **内存不足**：模型加载需要较多内存，考虑使用 GPU 或更小的模型。
- **依赖版本冲突**：使用虚拟环境隔离依赖。
- **Expo 构建失败**：清除缓存 `npx expo start --clear`。



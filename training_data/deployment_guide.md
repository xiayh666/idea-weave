# ECA Designer 模型部署指南

## 1. 部署选项对比

| 部署方式 | 延迟 | 成本 | 隐私 | 适用场景 |
|---------|------|------|------|----------|
| 云端 API | 1-3s | 中等 | 低 | 快速原型 |
| 本地服务器 | 200-500ms | 低 | 高 | 企业应用 |
| 边缘设备 | 500ms-1s | 极低 | 极高 | 移动端/IoT |

## 2. 本地服务器部署

### 2.1 硬件要求

**最低配置**:
- GPU: NVIDIA RTX 3060 (12GB VRAM)
- RAM: 16GB
- Storage: 50GB SSD

**推荐配置**:
- GPU: NVIDIA RTX 4090 (24GB VRAM)
- RAM: 32GB
- Storage: 100GB NVMe SSD

### 2.2 Docker 部署

```dockerfile
# Dockerfile
FROM nvidia/cuda:11.8.0-cudnn8-devel-ubuntu22.04

# 安装依赖
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 复制模型文件
COPY eca_designer_merged /app/model
COPY api_server.py /app/
COPY requirements.txt /app/

# 安装 Python 依赖
RUN pip3 install --no-cache-dir -r requirements.txt

# 暴露端口
EXPOSE 8000

# 启动服务
CMD ["python3", "api_server.py"]
```

```bash
# requirements.txt
torch>=2.0.0
transformers>=4.30.0
fastapi>=0.100.0
uvicorn>=0.23.0
pydantic>=2.0.0
accelerate>=0.20.0
```

```bash
# 构建镜像
docker build -t eca-designer-api .

# 运行容器
docker run -d \
  --name eca-designer \
  --gpus all \
  -p 8000:8000 \
  -v $(pwd)/eca_designer_merged:/app/model \
  eca-designer-api
```

### 2.3 API 服务器代码

```python
# api_server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import json
import time
from typing import Dict, Optional
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ECA Designer API", version="1.0")

# 全局模型和分词器
model = None
tokenizer = None

class ECARequest(BaseModel):
    instruction: str = "你是一个专业的绘图助手。"
    input: str
    context: Dict
    temperature: float = 0.1
    max_tokens: int = 512

class ECAResponse(BaseModel):
    success: bool
    data: Optional[Dict]
    error: Optional[str]
    latency_ms: float

@app.on_event("startup")
async def load_model():
    """启动时加载模型"""
    global model, tokenizer
    
    logger.info("正在加载模型...")
    model_path = "/app/model"
    
    # 加载分词器
    tokenizer = AutoTokenizer.from_pretrained(
        model_path,
        trust_remote_code=True
    )
    
    # 加载模型
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True
    )
    
    logger.info("模型加载完成")

@app.post("/generate", response_model=ECAResponse)
async def generate(request: ECARequest):
    """生成 ECA 指令"""
    
    start_time = time.time()
    
    try:
        # 构建提示词
        prompt = f"""### Instruction:
{request.instruction}

### Context:
{json.dumps(request.context, ensure_ascii=False)}

### Input:
{request.input}

### Response:
"""
        
        # Tokenize
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        
        # 生成
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=0.95,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        # 解码
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # 提取 JSON
        json_str = response.split("### Response:")[-1].strip()
        
        try:
            result = json.loads(json_str)
        except json.JSONDecodeError:
            # 如果解析失败，返回原始文本
            result = {"raw_response": json_str}
        
        latency = (time.time() - start_time) * 1000
        
        return ECAResponse(
            success=True,
            data=result,
            error=None,
            latency_ms=latency
        )
        
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        logger.error(f"生成失败: {str(e)}")
        
        return ECAResponse(
            success=False,
            data=None,
            error=str(e),
            latency_ms=latency
        )

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.get("/stats")
async def get_stats():
    """获取模型统计信息"""
    return {
        "model_name": "ECA Designer",
        "version": "1.0",
        "device": str(model.device if model else "unknown"),
        "memory_usage": torch.cuda.memory_allocated() / 1024**3 if torch.cuda.is_available() else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 2.4 客户端调用示例

```javascript
// 前端调用示例
async function generateECACommand(userInput, context) {
  const response = await fetch('http://localhost:8000/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: userInput,
      context: context,
      temperature: 0.1
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// 使用示例
const context = {
  current_objects: [
    { id: 'obj-001', name: 'Red_Square', type: 'rect' }
  ],
  selected_obj: { id: 'obj-001', name: 'Red_Square', type: 'rect' }
};

const result = await generateECACommand('把它变大', context);
console.log(result);
```

## 3. 边缘设备部署

### 3.1 NVIDIA Jetson 部署

```bash
# 在 Jetson 上安装依赖
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev

# 安装 PyTorch for Jetson
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# 安装 Transformers
pip3 install transformers accelerate

# 运行模型
python3 api_server.py
```

### 3.2 模型量化优化

```python
# 使用 GPTQ 量化进一步减小模型体积
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig

# 量化配置
quantize_config = BaseQuantizeConfig(
    bits=4,
    group_size=128,
    desc_act=False,
)

# 加载并量化模型
model = AutoGPTQForCausalLM.from_pretrained(
    "eca_designer_merged",
    quantize_config,
    device_map="auto",
    trust_remote_code=True
)

# 保存量化模型
model.save_quantized("eca_designer_gptq")
```

## 4. 性能监控

### 4.1 添加监控指标

```python
from prometheus_client import Counter, Histogram, generate_latest

# 定义指标
request_count = Counter('eca_requests_total', 'Total requests')
request_latency = Histogram('eca_request_latency_seconds', 'Request latency')
error_count = Counter('eca_errors_total', 'Total errors')

@app.post("/generate")
async def generate(request: ECARequest):
    request_count.inc()
    
    with request_latency.time():
        try:
            # ... 生成逻辑
            pass
        except Exception as e:
            error_count.inc()
            raise

@app.get("/metrics")
async def metrics():
    return generate_latest()
```

### 4.2 日志记录

```python
import structlog

logger = structlog.get_logger()

@app.post("/generate")
async def generate(request: ECARequest):
    logger.info(
        "生成请求",
        input=request.input,
        context=request.context
    )
    
    # ... 生成逻辑
    
    logger.info(
        "生成完成",
        latency_ms=latency,
        success=result.success
    )
```

## 5. 负载均衡

### 5.1 使用 Nginx

```nginx
upstream eca_backend {
    server localhost:8000;
    server localhost:8001;
    server localhost:8002;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://eca_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5.2 使用 Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: eca-designer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: eca-designer
  template:
    metadata:
      labels:
        app: eca-designer
    spec:
      containers:
      - name: eca-designer
        image: eca-designer-api:latest
        ports:
        - containerPort: 8000
        resources:
          limits:
            nvidia.com/gpu: 1
---
apiVersion: v1
kind: Service
metadata:
  name: eca-designer-service
spec:
  selector:
    app: eca-designer
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

## 6. 安全考虑

### 6.1 API 认证

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

@app.post("/generate")
async def generate(
    request: ECARequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    
    # 验证 token
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # ... 生成逻辑
```

### 6.2 速率限制

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/generate")
@limiter.limit("10/minute")
async def generate(request: ECARequest):
    # ... 生成逻辑
```

## 7. 备份与恢复

```bash
# 备份模型
tar -czvf eca_designer_backup.tar.gz eca_designer_merged/

# 恢复模型
tar -xzvf eca_designer_backup.tar.gz
```

## 8. 故障排查

### 8.1 常见问题

1. **OOM 错误**
   - 减小 batch size
   - 使用更激进的量化
   - 增加 GPU 内存

2. **生成速度慢**
   - 检查 GPU 利用率
   - 优化输入长度
   - 使用模型量化

3. **JSON 解析失败**
   - 降低 temperature
   - 增加 max_tokens
   - 添加后处理逻辑

### 8.2 调试模式

```python
# 启用详细日志
import logging
logging.basicConfig(level=logging.DEBUG)

# 添加调试端点
@app.post("/generate/debug")
async def generate_debug(request: ECARequest):
    # 返回完整的生成过程
    return {
        "prompt": prompt,
        "tokens": inputs.input_ids.shape[1],
        "raw_output": response,
        "parsed_output": result
    }
```

## 9. 总结

部署选项建议：
- **开发测试**：使用云端 API 快速验证
- **生产环境**：本地服务器部署，确保低延迟
- **移动端**：边缘设备部署，保护隐私

通过合理的部署策略，可以实现：
- 200-500ms 的响应延迟
- 降低 80% 的 API 成本
- 100% 的数据隐私保护
- 离线使用能力

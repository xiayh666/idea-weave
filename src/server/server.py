import os
# 提前解决 OMP 报错问题
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import torch

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel  # 用于直接加载 LoRA 权重

import json
import os

config_path = "config.json"
if os.path.exists(config_path):
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)
else:
    # 默认兜底配置
    config = {
        "base_model": "./models/Qwen2.5-1.5B-Instruct",
        "lora_path": "./lora_adapter",
        "merged_path": "./merged_model"
    }


model_path = config["paths"]["base_model"]
lora_path = config["paths"]["lora_path"]




app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


print("正在加载基础模型和分词器...")
tokenizer = AutoTokenizer.from_pretrained(model_path, trust_remote_code=True)
base_model = AutoModelForCausalLM.from_pretrained(
    model_path,
    device_map="auto",
    torch_dtype=torch.bfloat16,
    trust_remote_code=True
)

print("正在加载 LoRA 权重...")
model = PeftModel.from_pretrained(base_model, lora_path)
model.eval()  # 设置为推理模式
print("模型加载完成！服务端已启动。")

SYSTEM_PROMPT = """你是一个专业的图形引擎指令转换器。请根据用户的自然语言，严格按照以下 TypeScript 定义输出 JSON。不要输出任何其他解释文本。
# 可用参数规范：
type Operation = "CREATE" | "MODIFY" | "DELETE";

interface OutputJSON {
  op: Operation;
  data?: ShapeData; // CREATE 时必填
  properties?: Partial<ShapeData>; // MODIFY 时必填
  ids?: "all" | string[]; // DELETE 时使用
}

interface ShapeData {
  type: "rect" | "circle" | "triangle" | "text";
  x: number;
  y: number;
  width?: number; // rect, triangle 使用
  height?: number; // rect, triangle 使用
  radius?: number; // circle 使用
  text?: string; // text 使用
  fillColor: string; // 必须是HEX格式，如 #ff0000
  opacity?: number; // 0.0 到 1.0
  behaviors?: Behavior[];
}

interface Behavior {
  trigger: "onClick" | "onHover" | "onHoverOut" | "onDrag" | "onTimer";
  triggerParams?: { interval?: number }; // onTimer 必填
  behaviorTree: BehaviorNode;
}

// 行为树节点规范
type BehaviorNode = 
  | { node: "sequence" | "selector" | "parallel", children: BehaviorNode[] }
  | { node: "repeat", params: { count: number }, child: BehaviorNode }
  | { node: "action", name: "move" | "scale" | "rotate" | "fade" | "wait", params?: any, duration?: number }
  | { node: "condition", name: "isSelected" | "isColliding" | "equals", params?: any }
  | { node: "call", params: { functionName: string, [key:string]: any } };
  
"""


class RequestData(BaseModel):
    instruction: str
    context: Optional[Dict[str, Any]] = None


import json
from json_repair import repair_json  # 引入大模型 JSON 修复神器


@app.post("/generate")
async def generate_json(request_data: RequestData):
    user_input = request_data.instruction

    messages = [
        {"role": "user", "content": user_input}
    ]

    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    ).to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=512,
            pad_token_id=tokenizer.eos_token_id,
            # 建议加上温度参数，让模型输出更稳定
            temperature=0.1,
            do_sample=False
        )

    response_ids = outputs[0][inputs["input_ids"].shape[-1]:]
    response_text = tokenizer.decode(response_ids, skip_special_tokens=True)

    # ================= 核心修复逻辑 =================
    print("\n[AI 原始输出]:", response_text)

    try:
        # repair_json 会自动修正多余/缺失的括号、引号，并返回合法的 JSON 字符串
        cleaned_text = repair_json(response_text)
        print("[修复后输出]:", cleaned_text)
    except Exception as e:
        print("[JSON修复失败]:", e)
        cleaned_text = "{}"  # 极端情况下的兜底

    return {"status": "success", "data": cleaned_text}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
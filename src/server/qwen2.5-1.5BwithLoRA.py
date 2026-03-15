from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel



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

# 1. 加载模型和分词器
tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=True)
base_model = AutoModelForCausalLM.from_pretrained(
    model_path,
    local_files_only=True,
    torch_dtype="auto",  # 自动选择 float16 或 bfloat16，比默认 float32 快一倍且省一半显存
    device_map="auto"    # 自动映射到 GPU (cuda:0)
)
model = PeftModel.from_pretrained(base_model, lora_path)
model = model.eval() #
# 2. 初始化对话历史
messages = []

print("系统：模型已就绪。输入 'exit' 退出对话。")

# 3. 开启循环
while True:
    # 获取用户输入
    user_input = input("\n用户: ")

    if user_input.lower() in ['exit', 'quit']:
        break

    # 将用户的问题添加到对话历史
    messages.append({"role": "user", "content": user_input})

    # 生成模型输入格式
    inputs = tokenizer.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    ).to(model.device)

    # 4. 生成回答
    # 移除了固定输出长度限制，允许更自然的回答
    outputs = model.generate(
        **inputs,
        max_new_tokens=512,
        pad_token_id=tokenizer.eos_token_id
    )

    # 解码并提取最新的回复
    response_ids = outputs[0][inputs["input_ids"].shape[-1]:]
    response_text = tokenizer.decode(response_ids, skip_special_tokens=True)

    print(f"助手: {response_text}")

    # 5. 关键：将助手的回答也存入历史，实现多轮对话
    messages.append({"role": "assistant", "content": response_text})

    # 可选：防止对话历史过长导致内存溢出 (只保留最近 10 轮)
    if len(messages) > 20:
        messages = messages[-20:]
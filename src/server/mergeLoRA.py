from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

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


base_model_path = config["paths"]["base_model"]
lora_path = config["paths"]["lora_path"]

# 加载基座和插件
base_model = AutoModelForCausalLM.from_pretrained(base_model_path, device_map="cpu")
tokenizer = AutoTokenizer.from_pretrained(base_model_path)
model = PeftModel.from_pretrained(base_model, lora_path)

# 合并并保存
merged_model = model.merge_and_unload()
merged_model.save_pretrained("./merged_model")
tokenizer.save_pretrained("./merged_model")
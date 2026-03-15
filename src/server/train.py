from unsloth import FastLanguageModel
import torch
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import load_dataset
import json
import os

# ================= 1. 读取 GUI 配置 =================
CONFIG_PATH = "config.json"

if not os.path.exists(CONFIG_PATH):
    print(f"错误: 找不到 {CONFIG_PATH}，请先通过管理界面保存配置。")
    exit(1)

with open(CONFIG_PATH, "r", encoding="utf-8") as f:
    cfg = json.load(f)

# 路径参数
BASE_MODEL_PATH = cfg["paths"]["base_model"]
DATASET_PATH = cfg["paths"]["dataset_path"]
LORA_OUTPUT_PATH = cfg["paths"]["lora_path"]

# 训练参数
TRAIN_PARAMS = cfg["train_params"]
max_seq_length = 1024  # 显存优化建议值

print(f">>> 正在加载模型: {BASE_MODEL_PATH}")

# ================= 2. 加载模型 =================
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = BASE_MODEL_PATH,
    max_seq_length = max_seq_length,
    load_in_4bit = True,
)

# ================= 3. 设置 LoRA =================
model = FastLanguageModel.get_peft_model(
    model,
    r = int(TRAIN_PARAMS["lora_r"]), # 从 GUI 读取 r 值
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth",
)

# ================= 4. 加载并格式化数据 =================
def formatting_prompts_func(examples):
    instructions = examples["instruction"]
    outputs      = examples["output"]
    texts = []
    for instruction, output in zip(instructions, outputs):
        # 使用标准的 ChatML 格式 (适合 Qwen 系列)
        text = f"<|im_start|>system\n你是一个行为树专家，根据用户指令生成符合指南的 JSON 配置。<|im_end|>\n" \
               f"<|im_start|>user\n{instruction}<|im_end|>\n" \
               f"<|im_start|>assistant\n{output}<|im_end|>"
        texts.append(text)
    return { "text" : texts }

print(f">>> 正在加载数据集: {DATASET_PATH}")
dataset = load_dataset("json", data_files=DATASET_PATH, split="train")
dataset = dataset.map(formatting_prompts_func, batched = True)

# ================= 5. 设置训练参数 =================
trainer = SFTTrainer(
    model = model,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = max_seq_length,
    args = TrainingArguments(
        per_device_train_batch_size = int(TRAIN_PARAMS["batch_size"]),
        gradient_accumulation_steps = int(TRAIN_PARAMS["grad_accum"]),
        warmup_steps = 5,
        max_steps = int(TRAIN_PARAMS["max_steps"]), # 从 GUI 读取步数
        learning_rate = float(TRAIN_PARAMS["learning_rate"]), # 从 GUI 读取学习率
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
    ),
)

# ================= 6. 开始训练 =================
print(">>> 开始训练...")
trainer_stats = trainer.train()

# ================= 7. 保存 LoRA 权重 =================
print(f">>> 训练完成，正在保存至: {LORA_OUTPUT_PATH}")
model.save_pretrained(LORA_OUTPUT_PATH)
tokenizer.save_pretrained(LORA_OUTPUT_PATH)

print(">>> 任务结束。")
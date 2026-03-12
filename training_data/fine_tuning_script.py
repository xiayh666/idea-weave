"""
ECA Designer 模型微调脚本
使用 QLoRA 进行高效微调
"""

import json
import torch
from datasets import Dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer
import os

# 配置参数
MODEL_NAME = "Qwen/Qwen2.5-7B-Instruct-1M"  # 或其他模型
DATA_PATH = "training_data.jsonl"
OUTPUT_DIR = "./eca_designer_model"

# QLoRA 配置
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05

# 训练配置
BATCH_SIZE = 4
GRADIENT_ACCUMULATION_STEPS = 4
NUM_EPOCHS = 3
LEARNING_RATE = 2e-4
MAX_SEQ_LENGTH = 2048


def load_training_data(file_path: str) -> Dataset:
    """加载训练数据"""
    
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            data.append(json.loads(line))
    
    dataset = Dataset.from_list(data)
    print(f"加载了 {len(dataset)} 条训练数据")
    return dataset


def format_instruction(sample):
    """格式化指令"""
    return sample['text']


def setup_model_and_tokenizer():
    """设置模型和分词器"""
    
    # 量化配置
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    
    # 加载模型
    print(f"正在加载模型: {MODEL_NAME}")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
        torch_dtype=torch.float16,
    )
    
    # 加载分词器
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        padding_side="right"
    )
    
    # 设置 pad token
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    return model, tokenizer


def setup_lora(model):
    """设置 LoRA"""
    
    # 准备模型用于 4-bit 训练
    model = prepare_model_for_kbit_training(model)
    
    # LoRA 配置
    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        target_modules=[
            "q_proj",
            "k_proj",
            "v_proj",
            "o_proj",
            "gate_proj",
            "up_proj",
            "down_proj",
        ],
        lora_dropout=LORA_DROPOUT,
        bias="none",
        task_type="CAUSAL_LM",
    )
    
    # 应用 LoRA
    model = get_peft_model(model, lora_config)
    
    # 打印可训练参数
    model.print_trainable_parameters()
    
    return model


def setup_training_args():
    """设置训练参数"""
    
    return TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        optim="paged_adamw_8bit",
        learning_rate=LEARNING_RATE,
        lr_scheduler_type="cosine",
        warmup_ratio=0.03,
        logging_steps=10,
        save_strategy="epoch",
        evaluation_strategy="no",
        fp16=True,
        bf16=False,
        group_by_length=True,
        report_to="tensorboard",
        run_name="eca_designer_finetuning",
    )


def train_model():
    """训练模型"""
    
    # 加载数据
    dataset = load_training_data(DATA_PATH)
    
    # 设置模型和分词器
    model, tokenizer = setup_model_and_tokenizer()
    
    # 设置 LoRA
    model = setup_lora(model)
    
    # 设置训练参数
    training_args = setup_training_args()
    
    # 创建训练器
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        args=training_args,
        max_seq_length=MAX_SEQ_LENGTH,
        formatting_func=format_instruction,
    )
    
    # 开始训练
    print("开始训练...")
    trainer.train()
    
    # 保存模型
    print(f"保存模型到 {OUTPUT_DIR}")
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print("训练完成!")


def merge_and_export():
    """合并 LoRA 权重并导出完整模型"""
    
    from peft import AutoPeftModelForCausalLM
    
    print("正在合并 LoRA 权重...")
    
    # 加载微调后的模型
    model = AutoPeftModelForCausalLM.from_pretrained(
        OUTPUT_DIR,
        device_map="auto",
        torch_dtype=torch.float16,
    )
    
    # 合并权重
    merged_model = model.merge_and_unload()
    
    # 保存完整模型
    merged_output_dir = f"{OUTPUT_DIR}_merged"
    print(f"保存合并后的模型到 {merged_output_dir}")
    merged_model.save_pretrained(merged_output_dir)
    
    # 复制分词器
    tokenizer = AutoTokenizer.from_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(merged_output_dir)
    
    print("模型合并完成!")


def test_model():
    """测试模型"""
    
    from transformers import pipeline
    
    print("正在加载模型进行测试...")
    
    # 加载模型
    model_path = f"{OUTPUT_DIR}_merged"
    generator = pipeline(
        "text-generation",
        model=model_path,
        tokenizer=model_path,
        torch_dtype=torch.float16,
        device_map="auto",
    )
    
    # 测试用例
    test_cases = [
        {
            "instruction": "你是一个专业的绘图助手。",
            "input": "创建一个红色的正方形",
            "context": {"current_objects": [], "selected_obj": None}
        },
        {
            "instruction": "你是一个专业的绘图助手。",
            "input": "把它变大",
            "context": {
                "current_objects": [{"id": "obj-001", "name": "Red_Square", "type": "rect"}],
                "selected_obj": {"id": "obj-001", "name": "Red_Square", "type": "rect"}
            }
        }
    ]
    
    print("\n测试结果:")
    for i, test in enumerate(test_cases, 1):
        prompt = f"""### Instruction:
{test['instruction']}

### Context:
{json.dumps(test['context'], ensure_ascii=False)}

### Input:
{test['input']}

### Response:
"""
        
        output = generator(
            prompt,
            max_new_tokens=256,
            temperature=0.1,
            do_sample=True,
            return_full_text=False
        )[0]['generated_text']
        
        print(f"\n测试 {i}:")
        print(f"输入: {test['input']}")
        print(f"输出: {output}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "train":
            train_model()
        elif command == "merge":
            merge_and_export()
        elif command == "test":
            test_model()
        elif command == "all":
            train_model()
            merge_and_export()
            test_model()
        else:
            print(f"未知命令: {command}")
            print("可用命令: train, merge, test, all")
    else:
        print("ECA Designer 模型微调工具")
        print("用法: python fine_tuning_script.py [train|merge|test|all]")

"""
ECA Designer 数据收集工具
用于从实际使用中收集训练数据
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional

class ECATrainingDataCollector:
    """ECA 训练数据收集器"""
    
    def __init__(self, output_file: str = "collected_data.json"):
        self.output_file = output_file
        self.samples = []
        self.load_existing_data()
    
    def load_existing_data(self):
        """加载已有的数据"""
        try:
            with open(self.output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.samples = data.get('samples', [])
                print(f"已加载 {len(self.samples)} 条现有数据")
        except FileNotFoundError:
            print("创建新的数据文件")
            self.samples = []
    
    def add_sample(
        self,
        user_input: str,
        model_output: Dict,
        context: Dict,
        category: str = "general",
        instruction: str = "你是一个专业的绘图助手。",
        is_correct: bool = True,
        user_correction: Optional[Dict] = None
    ):
        """添加一条训练样本"""
        
        sample = {
            "id": f"sample_{len(self.samples) + 1:04d}",
            "category": category,
            "instruction": instruction,
            "input": user_input,
            "context": context,
            "output": user_correction if user_correction else model_output,
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "is_correct": is_correct,
                "original_output": model_output if user_correction else None
            }
        }
        
        self.samples.append(sample)
        print(f"已添加样本: {sample['id']} - {user_input[:30]}...")
        
        # 自动保存
        self.save_data()
        
        return sample['id']
    
    def save_data(self):
        """保存数据到文件"""
        data = {
            "dataset_info": {
                "name": "ECA_Collected_Data",
                "version": "1.0",
                "total_samples": len(self.samples),
                "last_updated": datetime.now().isoformat()
            },
            "samples": self.samples
        }
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"数据已保存到 {self.output_file}")
    
    def export_to_training_format(self, output_file: str = "training_data.jsonl"):
        """导出为训练格式（JSONL）"""
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for sample in self.samples:
                # 构建训练格式
                training_sample = {
                    "instruction": sample['instruction'],
                    "input": sample['input'],
                    "output": json.dumps(sample['output'], ensure_ascii=False),
                    "context": sample['context']
                }
                
                # 构建对话格式
                prompt = f"""### Instruction:
{training_sample['instruction']}

### Context:
{json.dumps(training_sample['context'], ensure_ascii=False)}

### Input:
{training_sample['input']}

### Response:
{training_sample['output']}"""
                
                f.write(json.dumps({"text": prompt}, ensure_ascii=False) + '\n')
        
        print(f"已导出 {len(self.samples)} 条数据到 {output_file}")
    
    def get_statistics(self):
        """获取数据统计信息"""
        categories = {}
        for sample in self.samples:
            cat = sample['category']
            categories[cat] = categories.get(cat, 0) + 1
        
        correct_count = sum(1 for s in self.samples if s['metadata']['is_correct'])
        
        return {
            "total_samples": len(self.samples),
            "categories": categories,
            "correct_rate": correct_count / len(self.samples) if self.samples else 0
        }
    
    def generate_synthetic_data(self, num_samples: int = 100):
        """生成合成数据（用于快速扩充数据集）"""
        
        import random
        
        shapes = ["rect", "circle", "text", "triangle"]
        colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"]
        positions = ["左上角", "右上角", "左下角", "右下角", "中间", "上方", "下方", "左边", "右边"]
        actions = ["变大", "变小", "变红", "变蓝", "变绿", "旋转", "移动"]
        
        templates = [
            # CREATE 模板
            {"template": "创建一个{color}的{shape}在{position}", "category": "CREATE"},
            {"template": "在{position}画一个{color}的{shape}", "category": "CREATE"},
            {"template": "添加一个{color}的{shape}", "category": "CREATE"},
            
            # MODIFY 模板
            {"template": "把{color}的{shape}{action}", "category": "MODIFY"},
            {"template": "让{color}的{shape}{action}", "category": "MODIFY"},
            {"template": "将{color}的{shape}{action}", "category": "MODIFY"},
            
            # ANIMATE 模板
            {"template": "让{color}的{shape}旋转{angle}度", "category": "ANIMATE"},
            {"template": "使{color}的{shape}动起来", "category": "ANIMATE"},
            
            # DELETE 模板
            {"template": "删除{color}的{shape}", "category": "DELETE"},
            {"template": "移除{color}的{shape}", "category": "DELETE"},
        ]
        
        generated = 0
        for _ in range(num_samples):
            template_info = random.choice(templates)
            template = template_info["template"]
            category = template_info["category"]
            
            # 填充模板
            text = template.format(
                color=random.choice(["红色", "蓝色", "绿色", "黄色", "紫色"]),
                shape=random.choice(["正方形", "圆形", "三角形", "矩形"]),
                position=random.choice(positions),
                action=random.choice(actions),
                angle=random.choice([90, 180, 270, 360])
            )
            
            # 生成对应的输出（简化版）
            output = self._generate_synthetic_output(text, category)
            
            # 添加上下文
            context = {
                "current_objects": [
                    {"id": f"obj-{i}", "name": f"Object_{i}", "type": random.choice(shapes)}
                    for i in range(random.randint(0, 3))
                ],
                "selected_obj": None
            }
            
            self.add_sample(
                user_input=text,
                model_output=output,
                context=context,
                category=category,
                is_correct=True
            )
            
            generated += 1
        
        print(f"生成了 {generated} 条合成数据")
    
    def _generate_synthetic_output(self, text: str, category: str) -> Dict:
        """生成合成输出（简化版）"""
        
        if category == "CREATE":
            return {
                "type": "CREATE",
                "shape": "rect",
                "color": "#ff0000",
                "position": {"x": 400, "y": 300},
                "size": {"width": 100, "height": 100},
                "name": "Synthetic_Object"
            }
        elif category == "MODIFY":
            return {
                "type": "MODIFY",
                "id": "obj-001",
                "properties": {"color": "#00ff00"}
            }
        elif category == "ANIMATE":
            return {
                "type": "ANIMATE",
                "id": "obj-001",
                "action": "rotate",
                "duration": 1.0,
                "params": {"rotation": 360}
            }
        elif category == "DELETE":
            return {
                "type": "DELETE",
                "id": "obj-001"
            }
        else:
            return {"type": "UNKNOWN"}


# 使用示例
if __name__ == "__main__":
    # 创建收集器
    collector = ECATrainingDataCollector("collected_data.json")
    
    # 添加真实使用数据
    collector.add_sample(
        user_input="创建一个红色的正方形",
        model_output={
            "type": "CREATE",
            "shape": "rect",
            "color": "#ff0000",
            "position": {"x": 400, "y": 300},
            "size": {"width": 100, "height": 100},
            "name": "Red_Square"
        },
        context={
            "current_objects": [],
            "selected_obj": None
        },
        category="CREATE",
        is_correct=True
    )
    
    # 添加需要修正的数据
    collector.add_sample(
        user_input="把它变大",
        model_output={
            "type": "MODIFY",
            "id": "wrong-id",
            "properties": {"size": {"width": 150, "height": 150}}
        },
        context={
            "current_objects": [
                {"id": "obj-001", "name": "Red_Square", "type": "rect"}
            ],
            "selected_obj": {"id": "obj-001", "name": "Red_Square", "type": "rect"}
        },
        category="MODIFY_PRONOUN",
        is_correct=False,
        user_correction={
            "type": "MODIFY",
            "id": "obj-001",
            "properties": {"size": {"width": 150, "height": 150}}
        }
    )
    
    # 生成合成数据
    # collector.generate_synthetic_data(50)
    
    # 导出为训练格式
    collector.export_to_training_format("training_data.jsonl")
    
    # 查看统计信息
    stats = collector.get_statistics()
    print("\n数据统计:")
    print(f"总样本数: {stats['total_samples']}")
    print(f"类别分布: {stats['categories']}")
    print(f"正确率: {stats['correct_rate']:.2%}")

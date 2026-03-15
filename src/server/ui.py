import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
import subprocess
import threading
import json
import os


class LLMControlCenter:
    def __init__(self, root):
        self.root = root
        self.root.title("Gemini 辅助 - 大模型后端全参数管理中心")
        self.root.geometry("1000x800")
        self.config_file = "config.json"
        self.load_config()
        self.setup_ui()

    def load_config(self):
        default = {
            "paths": {
                "base_model": "D:/models/Qwen2.5-1.5B-Instruct",
                "lora_path": "./lora_adapter",
                "merged_path": "./merged_model",
                "dataset_path": "./dataset3.jsonl"
            },
            "train_params": {
                "max_steps": 120, "lora_r": 16, "learning_rate": "2e-4",
                "batch_size": 1, "grad_accum": 4
            }
        }
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except:
                self.data = default
        else:
            self.data = default

    def save_config(self):
        # 提取路径
        self.data["paths"]["base_model"] = self.entries["base_model"].get()
        self.data["paths"]["lora_path"] = self.entries["lora_path"].get()
        self.data["paths"]["merged_path"] = self.entries["merged_path"].get()
        self.data["paths"]["dataset_path"] = self.entries["dataset_path"].get()
        # 提取训练参数
        for key in self.data["train_params"]:
            self.data["train_params"][key] = self.entries[key].get()

        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=4)
        self.log(">>> [配置] 所有参数已成功保存。")

    def setup_ui(self):
        self.entries = {}

        # --- 路径配置 (左侧) ---
        path_frame = tk.LabelFrame(self.root, text="路径配置", padx=10, pady=10)
        path_frame.pack(fill="x", padx=10, pady=5)

        self.entries["base_model"] = self.add_row(path_frame, "基础模型:", self.data["paths"]["base_model"], 0)
        self.entries["lora_path"] = self.add_row(path_frame, "LoRA 适配器:", self.data["paths"]["lora_path"], 1)
        self.entries["merged_path"] = self.add_row(path_frame, "合并后路径:", self.data["paths"]["merged_path"], 2)
        self.entries["dataset_path"] = self.add_row(path_frame, "训练数据集:", self.data["paths"]["dataset_path"], 3,
                                                    is_file=True)

        # --- 训练参数配置 (中间) ---
        param_frame = tk.LabelFrame(self.root, text="训练参数", padx=10, pady=10)
        param_frame.pack(fill="x", padx=10, pady=5)

        # 使用 Grid 布局排列小框
        labels = [("Max Steps", "max_steps"), ("LoRA R", "lora_r"), ("Learning Rate", "learning_rate"),
                  ("Batch Size", "batch_size"), ("Grad Accum", "grad_accum")]

        for i, (label, key) in enumerate(labels):
            tk.Label(param_frame, text=label).grid(row=0, column=i * 2, sticky="w", padx=5)
            e = tk.Entry(param_frame, width=10)
            e.insert(0, str(self.data["train_params"][key]))
            e.grid(row=0, column=i * 2 + 1, padx=5)
            self.entries[key] = e

        # --- 动作按钮 ---
        btn_frame = tk.Frame(self.root, pady=10)
        btn_frame.pack(fill="x", padx=10)

        tk.Button(btn_frame, text="💾 保存并同步", command=self.save_config, bg="#2196F3", fg="white", width=15).pack(
            side="left", padx=5)
        tk.Button(btn_frame, text="📊 检测数据集", command=self.check_dataset, bg="#9C27B0", fg="white", width=15).pack(
            side="left", padx=5)

        # 启动按钮
        actions = [("🚀 训练", "train.py"), ("🔗 合并", "mergeLoRA.py"), ("🌐 后端服务器", "server.py"),
                   ("💬 对话", "qwen2.5-1.5BwithLoRA.py")]
        for text, script in actions:
            tk.Button(btn_frame, text=text, command=lambda s=script: self.run_script(s), width=12).pack(side="right",
                                                                                                        padx=2)

        # --- 日志显示 ---
        self.log_area = scrolledtext.ScrolledText(self.root, bg="#1a1a1a", fg="#00ff00", font=("Consolas", 10))
        self.log_area.pack(fill="both", expand=True, padx=10, pady=10)

    def add_row(self, parent, label, val, row, is_file=False):
        tk.Label(parent, text=label).grid(row=row, column=0, sticky="w")
        entry = tk.Entry(parent, width=80)
        entry.insert(0, val)
        entry.grid(row=row, column=1, padx=5, pady=2)
        tk.Button(parent, text="选择", command=lambda: self.browse(entry, is_file)).grid(row=row, column=2)
        return entry

    def browse(self, entry, is_file):
        path = filedialog.askopenfilename() if is_file else filedialog.askdirectory()
        if path: entry.delete(0, tk.END); entry.insert(0, path)

    def check_dataset(self):
        path = self.entries["dataset_path"].get()
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                count = sum(1 for _ in f)
            batch = int(self.entries["batch_size"].get())
            accum = int(self.entries["grad_accum"].get())
            steps_per_epoch = count // (batch * accum)
            self.log(f">>> [检测] 数据集行数: {count} | 跑完一轮需 {steps_per_epoch} Steps")
        else:
            self.log(">>> [错误] 找不到数据集文件")

    def log(self, text):
        self.log_area.insert(tk.END, text + "\n");
        self.log_area.see(tk.END)

    def run_script(self, script):
        self.save_config()
        if "withLoRA" in script:
            os.system(f"start cmd /k python {script}")
            return

        def run():
            proc = subprocess.Popen(["python", "-u", script],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    text=True,
                                    encoding="utf-8"
            )
            for line in proc.stdout: self.log(line.strip())
            proc.wait()

        threading.Thread(target=run, daemon=True).start()


if __name__ == "__main__":
    root = tk.Tk();
    LLMControlCenter(root);
    root.mainloop()
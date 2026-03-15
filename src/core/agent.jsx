const API_BASE_URL = 'http://localhost:8000'; 

/**
 * 将自然语言指令发送给后端的 Qwen2.5-1.5B 引擎
 * * @param {string} prompt 用户输入的自然语言指令
 * @param {string|null} currentSelectedId 当前在画布上选中的物体 ID
 * @returns {Promise<Object>} 返回标准的动作对象: { op, data, properties, ids }
 */
export const askAI = async (prompt, currentSelectedId = null) => {
  try {
    // 1. 组装最极简的请求体
    const requestBody = {
      instruction: prompt,
      context: {
        selectedId: currentSelectedId // 给后端提供上下文（比如 AI 需要知道用户正在修改谁）
      }
    };
    console.log(requestBody)


    // 2. 发送网络请求给你的后端
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log(result)


    if (result.status !== 'success') {
      throw new Error('后端 AI 推理失败');
    }

    // 3. 解析清洗 AI 返回的 JSON
    // 防御性编程：把大模型可能带有的 Markdown 代码块标签 (```json ... ```) 剔除掉
    let rawJson = result.data;
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 解析成 JavaScript 对象
    const aiAction = JSON.parse(rawJson);
    
    return aiAction;

  } catch (error) {
    console.error('AI Agent 请求或解析错误:', error);
    throw error;
  }
};
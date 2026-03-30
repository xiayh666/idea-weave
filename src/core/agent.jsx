const API_BASE_URL = 'http://localhost:8000';

const normalizeAction = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const opSource = (payload.op || payload.type || payload.command || payload.action || '').toString().toUpperCase();
  const op = ['CREATE', 'MODIFY', 'UPDATE', 'DELETE'].includes(opSource) ? opSource : 'UNKNOWN';
  return {
    ...payload,
    op,
  };
};

export const askAI = async (prompt, currentSelectedId = null) => {
  try {
    const requestBody = {
      instruction: prompt,
      context: {
        selectedId: currentSelectedId
      }
    };

    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return { success: false, error: `服务返回 ${response.status}` };
    }

    const payload = await response.json();
    if (payload.status !== 'success') {
      return { success: false, error: payload.message || 'AI 处理返回失败' };
    }

    let rawData = payload.data || '';
    rawData = rawData.replace(/```json/g, '').replace(/```/g, '').trim();
    if (!rawData) {
      return { success: false, error: 'AI 没有返回可解析的数据' };
    }

    let parsed;
    try {
      parsed = JSON.parse(rawData);
    } catch (error) {
      return { success: false, error: 'AI 返回的 JSON 无法解析' };
    }

    const action = normalizeAction(parsed);
    if (!action) {
      return { success: false, error: 'AI 返回的结构无效' };
    }

    return { success: true, action };
  } catch (error) {
    console.error('AI Agent 请求失败', error);
    return { success: false, error: error.message || 'AI 请求遇到未知错误' };
  }
};

/**
 * 简单的训练数据收集器
 * 用于收集用户实际使用数据，优化系统提示词
 */

const LOG_FILE = 'training_data_log.json';

const logTrainingData = (userInput, aiResponse, context, isCorrect = true) => {
  const sample = {
    id: `log_${Date.now()}`,
    input: userInput,
    output: aiResponse,
    context: {
      current_objects: context.currentObjects?.map(o => ({
        id: o.id,
        name: o.name,
        type: o.type
      })) || [],
      selected_obj: context.selectedObj ? {
        id: context.selectedObj.id,
        name: context.selectedObj.name,
        type: context.selectedObj.type
      } : null
    },
    is_correct: isCorrect,
    timestamp: new Date().toISOString()
  };

  try {
    // 读取现有数据
    let existingData = [];
    try {
      const stored = localStorage.getItem(LOG_FILE);
      if (stored) {
        existingData = JSON.parse(stored);
      }
    } catch (e) {
      console.error('读取训练数据失败:', e);
    }

    // 添加新数据
    existingData.push(sample);

    // 限制存储数量（保留最近 100 条）
    if (existingData.length > 100) {
      existingData = existingData.slice(-100);
    }

    // 保存数据
    localStorage.setItem(LOG_FILE, JSON.stringify(existingData, null, 2));
    
    console.log('训练数据已记录:', sample.id);
  } catch (error) {
    console.error('记录训练数据失败:', error);
  }
};

// 导出函数
export { logTrainingData };

import { Send, Sparkles } from "lucide-react";

export const AiChatFooter = ({ input, setInput, handleAICommand }) => (
  <footer style={{ height: 160, borderTop: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['# 旋转正方形', '# 放大圆形', '# 移动方块'].map(tag => (
            <button key={tag} onClick={() => setInput(tag.replace('# ', ''))} style={{ padding: '4px 8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>{tag}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#2563eb' }}>
            <Sparkles size={18} fill="currentColor" />
          <span>IdeaWeave Agent</span>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAICommand(input))}
          placeholder="描述你想要的物体及其行为..."
          style={{ width: '100%', height: 96, padding: 12, paddingRight: 48, border: '1px solid #e2e8f0', borderRadius: 12, outline: 'none', fontSize: 14 }} />
        <button onClick={() => handleAICommand(input)} disabled={!input.trim()}
          style={{ position: 'absolute', right: 12, bottom: 12, padding: 8, backgroundColor: '#2563eb', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer', opacity: input.trim() ? 1 : 0.6 }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  </footer>
);

// 在 AiChatFooter.jsx 中或独立的服务文件中
const callAiApi = async (userInput, currentObjects) => {
  const API_KEY = "sk-4ddc42fea38a4368b93263d55f0b59cd";
  const SYSTEM_PROMPT = `你是一个绘图助手。根据用户指令，返回一个 JSON 数组，包含要执行的操作。
  支持操作：
  1. {"type": "CREATE", "shape": "rect"|"circle", "color": "hex"}
  2. {"type": "ANIMATE", "targetId": "id", "animation": "rotate"|"scale"|"move"}
  
  当前画布对象：${JSON.stringify(currentObjects.map(o => ({id: o.id, name: o.name})))}
  只返回 JSON，不要任何解释。`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview", // 或其他模型
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput }
      ],
      response_format: { type: "json_object" } // 强制 JSON
    })
  });
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};
'use client';
import { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:8000';

export default function CopilotPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '👋 Welcome to the **UrbanFlow AI Copilot**.\n\nI can help you with traffic intelligence queries. Ask me anything about:\n\n• 👮 Resource deployment\n• 🛣️ Road impact analysis\n• 💰 Economic cost estimates\n• 📊 Scenario comparisons\n• 🔍 Prediction explanations\n\nTry one of the suggestions below, or type your own question.' },
  ]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/copilot/suggestions`)
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []))
      .catch(() => setSuggestions([
        'How many officers do we need for a 50K concert at Koramangala?',
        'What is the current city risk score?',
        'What is the best intervention strategy for an accident?',
        'Compare 30K vs 50K vs 80K attendance scenarios',
      ]));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.response_text || 'I processed your request.' }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: '⚠️ Backend not available. Start the FastAPI server with:\n\n```\ncd backend && pip install -r requirements.txt && python -m uvicorn main:app --reload --port 8000\n```\n\nThen try your question again.',
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderMarkdown = (text) => {
    // Simple markdown rendering
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background:var(--bg-surface);padding:12px;border-radius:8px;font-size:12px;margin:8px 0;overflow-x:auto;font-family:var(--font-mono)">$1</pre>')
      .replace(/• /g, '<span style="color:var(--accent-cyan)">•</span> ');
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 8 }}>
        <h2>🤖 AI Copilot</h2>
        <p>Ask questions in natural language — get instant traffic intelligence</p>
      </div>

      <div className="copilot-container">
        <div className="copilot-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`copilot-message ${msg.role}`}>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
            </div>
          ))}

          {loading && (
            <div className="copilot-message assistant" style={{ display: 'flex', gap: 6, padding: '16px 20px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'pulse-green 1s infinite' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'pulse-green 1s infinite 0.2s' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)', animation: 'pulse-green 1s infinite 0.4s' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="copilot-suggestions">
            {suggestions.map((s, i) => (
              <button key={i} className="copilot-suggestion" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="copilot-input-area">
          <input
            className="copilot-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about traffic deployment, impact predictions, costs..."
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

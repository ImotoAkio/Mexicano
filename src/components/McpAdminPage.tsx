import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Shield, Key, Copy, Check, RefreshCw, Play, Send, Terminal,
  Lock, Unlock, Eye, EyeOff, Sparkles, CheckCircle2, AlertTriangle,
  Server, Activity, ChevronDown, ChevronRight, Trash2, ExternalLink, Settings
} from 'lucide-react';

interface McpTool {
  name: string;
  category: string;
  mode: 'read' | 'write';
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface McpLog {
  id: string;
  timestamp: string;
  toolName: string;
  source: 'external-mcp' | 'admin-chat' | 'admin-test';
  durationMs: number;
  success: boolean;
  argsPreview: string;
  resultPreview: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  executedTools?: Array<{ name: string; args: any; result: any }>;
}

export default function McpAdminPage() {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'config' | 'tools'>('chat');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Config state
  const [mcpAtivo, setMcpAtivo] = useState(true);
  const [permitirReservas, setPermitirReservas] = useState(true);
  const [permitirWhatsapp, setPermitirWhatsapp] = useState(true);
  const [sandboxAtiva, setSandboxAtiva] = useState(false);
  const [sandboxTelefone, setSandboxTelefone] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [geminiKeyMasked, setGeminiKeyMasked] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');

  // Tools & Logs
  const [tools, setTools] = useState<McpTool[]>([]);
  const [recentLogs, setRecentLogs] = useState<McpLog[]>([]);
  const [selectedToolName, setSelectedToolName] = useState<string>('consultar_saidas_do_dia');
  const [toolFormValues, setToolFormValues] = useState<Record<string, any>>({});
  const [runningTool, setRunningTool] = useState(false);
  const [toolResult, setToolResult] = useState<any>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Sou o **Gemini conectado ao Servidor MCP da Marina El Mexicano**. Tenho acesso em tempo real às **22 ferramentas** do sistema (Visão 360°, Clientes, Embarcações, Reservas, Financeiro, Manutenções, UTV, Combustível e WhatsApp).\n\nO que você gostaria de consultar ou executar agora?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [expandedToolCall, setExpandedToolCall] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mexicano.echo.dev.br';
  const sseUrl = `${origin}/api/mcp/sse`;
  const streamableHttpUrl = `${origin}/api/mcp`;
  const healthUrl = `${origin}/api/mcp/health`;

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchMcpData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/mcp/config', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setMcpAtivo(Boolean(data.config.mcpAtivo));
        setPermitirReservas(Boolean(data.config.permitirReservas));
        setPermitirWhatsapp(Boolean(data.config.permitirWhatsapp));
        setSandboxAtiva(Boolean(data.config.sandboxAtiva));
        setSandboxTelefone(data.config.sandboxTelefone || '');
        setApiKey(data.config.apiKey || '');
        setHasGeminiKey(Boolean(data.config.hasGeminiKey));
        setGeminiKeyMasked(data.config.geminiKeyMasked || '');
        setGeminiModel(data.config.geminiModel || 'gemini-2.5-flash');
        setTools(data.tools || []);
        setRecentLogs(data.recentLogs || []);
      }
    } catch (err: any) {
      showToast('Erro ao carregar configurações do MCP', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMcpData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, sendingChat]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveConfig = async (overrides?: Partial<{
    mcpAtivo: boolean;
    permitirReservas: boolean;
    permitirWhatsapp: boolean;
    geminiApiKey: string;
    geminiModel: string;
  }>) => {
    try {
      setSaving(true);
      const payload = {
        mcpAtivo: overrides?.mcpAtivo ?? mcpAtivo,
        permitirReservas: overrides?.permitirReservas ?? permitirReservas,
        permitirWhatsapp: overrides?.permitirWhatsapp ?? permitirWhatsapp,
        geminiApiKey: overrides?.geminiApiKey ?? (geminiKeyInput.trim() || undefined),
        geminiModel: overrides?.geminiModel ?? geminiModel,
      };
      const res = await fetch('/api/admin/mcp/config', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMcpAtivo(Boolean(data.config.mcpAtivo));
        setPermitirReservas(Boolean(data.config.permitirReservas));
        setPermitirWhatsapp(Boolean(data.config.permitirWhatsapp));
        setHasGeminiKey(Boolean(data.config.hasGeminiKey));
        setGeminiKeyMasked(data.config.geminiKeyMasked || '');
        setGeminiModel(data.config.geminiModel || 'gemini-2.5-flash');
        setGeminiKeyInput('');
        showToast('Configurações do MCP atualizadas com sucesso!');
      } else {
        showToast(data.message || 'Erro ao salvar configurações', 'error');
      }
    } catch {
      showToast('Falha de comunicação ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!window.confirm('Deseja gerar uma nova chave MCP_API_KEY? Qualquer integração externa usando a chave antiga precisará ser atualizada.')) {
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/admin/mcp/regenerate-key', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setApiKey(data.apiKey);
        setShowApiKey(true);
        showToast('Nova MCP_API_KEY gerada com sucesso!');
      }
    } catch {
      showToast('Erro ao regenerar chave', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendChat = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? chatInput).trim();
    if (!textToSend || sendingChat) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const historyPayload = chatMessages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setChatInput('');
    setSendingChat(true);

    try {
      const res = await fetch('/api/admin/mcp/chat', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'model',
            text: `⚠️ **Aviso:** ${data.message || 'Não foi possível processar a resposta.'}`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        if (data.needsGeminiKey) {
          setActiveSubTab('config');
        }
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `model_${Date.now()}`,
            role: 'model',
            text: data.reply,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            executedTools: data.executedTools || [],
          },
        ]);
        if (data.recentLogs) setRecentLogs(data.recentLogs);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'model',
          text: `❌ Erro de conexão ao consultar o Gemini: ${err.message || err}`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  const selectedTool = tools.find((t) => t.name === selectedToolName) || tools[0];

  const handleExecuteToolManual = async () => {
    if (!selectedTool) return;
    setRunningTool(true);
    setToolResult(null);
    try {
      const cleanedArgs: Record<string, any> = {};
      const props = selectedTool.inputSchema?.properties || {};
      for (const [k, v] of Object.entries(toolFormValues)) {
        if (v === '' || v === undefined) continue;
        if (props[k]?.type === 'number') {
          cleanedArgs[k] = Number(v);
        } else if (props[k]?.type === 'boolean') {
          cleanedArgs[k] = v === 'true' || v === true;
        } else {
          cleanedArgs[k] = v;
        }
      }

      const res = await fetch('/api/admin/mcp/execute-tool', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          toolName: selectedTool.name,
          args: cleanedArgs,
        }),
      });
      const data = await res.json();
      setToolResult(data.result ?? data);
      if (data.recentLogs) setRecentLogs(data.recentLogs);
    } catch (err: any) {
      setToolResult({ erro: err.message || 'Falha ao executar tool' });
    } finally {
      setRunningTool(false);
    }
  };

  const quickPrompts = [
    'Quais são as saídas de barcos agendadas para hoje?',
    'Me dê a visão 360 completa da embarcação EL MEXICANO 99',
    'Qual o resumo financeiro deste mês?',
    'Liste os clientes inadimplentes com maior valor em aberto',
    'Qual o nível atual do estoque de combustível da marina?',
    'Verifique o status da conexão do WhatsApp e se o Sandbox está ativo',
  ];

  if (loading) {
    return (
      <div className="min-h-[420px] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-4 border-[#186b77] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Carregando Painel de Gestão do Servidor MCP...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs font-bold text-white transition-all ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0f2930] to-[#186b77] rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
                <Bot className="w-6 h-6 text-teal-300" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                  Servidor MCP & Assistente Gemini
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                    mcpAtivo ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'
                  }`}>
                    {mcpAtivo ? '● MCP Online' : '○ MCP Desativado'}
                  </span>
                </h1>
                <p className="text-xs text-slate-300">
                  Model Context Protocol integrado ao domínio principal — {tools.length} ferramentas homologadas (Consultas, Reservas e WhatsApp)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-[11px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-300" />
              <span>Reservas IA: <strong>{permitirReservas ? 'Liberado' : 'Bloqueado'}</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-[11px] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-300" />
              <span>Sandbox WhatsApp: <strong>{sandboxAtiva ? 'ATIVO (Seguro)' : 'DESATIVADO (Envio Real)'}</strong></span>
            </div>
            <button
              onClick={fetchMcpData}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'chat'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-teal-600" />
            Chat Gemini no Navegador (Teste Real)
          </button>

          <button
            onClick={() => setActiveSubTab('config')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'config'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-amber-500" />
            URL da API, Chaves & Segurança
          </button>

          <button
            onClick={() => setActiveSubTab('tools')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'tools'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-500" />
            Testador Manual ({tools.length} Tools) & Auditoria
          </button>
        </div>
      </div>

      {/* ═════════════════════ ABA 1: CHAT GEMINI INTEGRADO ═════════════════════ */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[640px] overflow-hidden">
            {/* Chat Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Console Gemini ({geminiModel}) + 22 Tools MCP Ativas
                </span>
              </div>
              <button
                onClick={() =>
                  setChatMessages([
                    {
                      id: 'welcome',
                      role: 'model',
                      text: 'Conversa reiniciada! Como posso ajudar com os dados ou agendamentos da Marina?',
                      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                className="text-[11px] font-bold text-slate-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar conversa
              </button>
            </div>

            {/* Banner se não tiver GEMINI_API_KEY */}
            {!hasGeminiKey && (
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-amber-900">
                  <strong>Chave do Gemini necessária:</strong> Cole sua <code className="bg-amber-100 px-1.5 py-0.5 rounded">GEMINI_API_KEY</code> (Google AI Studio) para conversar direto pelo navegador:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => handleSaveConfig({ geminiApiKey: geminiKeyInput })}
                    disabled={!geminiKeyInput.trim() || saving}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                  >
                    Salvar Chave
                  </button>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                      msg.role === 'user'
                        ? 'bg-[#186b77] text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {/* Executed MCP Tools badges */}
                    {msg.executedTools && msg.executedTools.length > 0 && (
                      <div className="mb-2.5 pb-2 border-b border-slate-100 space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          Ferramentas MCP acionadas pelo Gemini ({msg.executedTools.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.executedTools.map((et, idx) => {
                            const callKey = `${msg.id}_tool_${idx}`;
                            const isExpanded = expandedToolCall === callKey;
                            return (
                              <div key={callKey} className="w-full">
                                <button
                                  type="button"
                                  onClick={() => setExpandedToolCall(isExpanded ? null : callKey)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                                >
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  {et.name}()
                                </button>
                                {isExpanded && (
                                  <div className="mt-1.5 p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[10px] overflow-x-auto space-y-1.5">
                                    <div>
                                      <span className="text-teal-400 font-bold">Parâmetros enviados:</span>{' '}
                                      {JSON.stringify(et.args)}
                                    </div>
                                    <div>
                                      <span className="text-amber-400 font-bold">Retorno do MCP:</span>
                                      <pre className="mt-1 max-h-44 overflow-y-auto text-slate-300">
                                        {JSON.stringify(et.result, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {sendingChat && (
                <div className="flex items-center gap-2.5 text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl px-4 py-3 w-fit shadow-2xs">
                  <div className="w-4 h-4 border-2 border-[#186b77] border-t-transparent rounded-full animate-spin" />
                  <span>Gemini está consultando o Servidor MCP...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2.5"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ex: Quais barcos saem hoje? Crie uma reserva para amanhã na M45..."
                className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186b77] focus:bg-white"
                disabled={sendingChat}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || sendingChat}
                className="px-5 py-2.5 bg-[#186b77] hover:bg-[#135660] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Enviar
              </button>
            </form>
          </div>

          {/* Right Column: Quick Prompts & Status */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#186b77]" />
                Testes Rápidos (1 Clique)
              </h3>
              <p className="text-[11px] text-slate-500">
                Clique em qualquer comando abaixo para testar o Gemini acionando as ferramentas do MCP ao vivo:
              </p>
              <div className="space-y-2">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendChat(prompt)}
                    disabled={sendingChat}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-[#186b77] hover:bg-teal-50/40 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <span>"{prompt}"</span>
                    <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#186b77] shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                Resumo da Conexão MCP
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">URL Streamable HTTP:</span>
                  <code className="font-mono text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded">/api/mcp</code>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">URL SSE:</span>
                  <code className="font-mono text-[11px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded">/api/mcp/sse</code>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Chave Gemini Configurada:</span>
                  <span className={`font-bold ${hasGeminiKey ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {hasGeminiKey ? `Sim (${geminiKeyMasked})` : 'Pendente'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Execuções na Sessão:</span>
                  <span className="font-bold text-slate-800">{recentLogs.length} chamadas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════ ABA 2: URL DA API, CHAVES & SEGURANÇA ═════════════════════ */}
      {activeSubTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Endpoints e Chave MCP_API_KEY */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#186b77]" />
                  Credenciais & Endpoints do Servidor MCP
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  O MCP já responde no próprio domínio do sistema, sem precisar configurar DNS ou porta extra.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Endpoint MCP (Streamable HTTP — Padrão Moderno)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={streamableHttpUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                  <button
                    onClick={() => handleCopy(streamableHttpUrl, 'httpUrl')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedField === 'httpUrl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copiar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Endpoint MCP SSE (Para n8n / SuperAssistant / Clientes SSE)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={sseUrl}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                  <button
                    onClick={() => handleCopy(sseUrl, 'sseUrl')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedField === 'sseUrl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copiar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Chave de Autenticação Secreta (MCP_API_KEY)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    readOnly
                    value={apiKey}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 cursor-pointer"
                    title={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleCopy(apiKey, 'apiKey')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedField === 'apiKey' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copiar
                  </button>
                  <button
                    onClick={handleRegenerateKey}
                    disabled={saving}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-1.5 cursor-pointer"
                    title="Gerar nova chave e invalidar a anterior"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Trocar
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Envie no cabeçalho <code className="bg-slate-100 px-1 rounded text-slate-600">Authorization: Bearer {'<MCP_API_KEY>'}</code> ou na URL <code className="bg-slate-100 px-1 rounded text-slate-600">?apiKey={'<MCP_API_KEY>'}</code>.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="text-[11px] font-extrabold uppercase text-[#186b77] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Conexão OAuth 2.1 para Google Gemini Web (gemini.google.com/customize/connectors)
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  O servidor possui descoberta automática <strong>OAuth 2.1 (RFC 9728 / RFC 8414 / PKCE)</strong> integrada. Basta colar a URL <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{streamableHttpUrl}</code> em <strong>Conectar-se a um servidor MCP</strong> e clicar em <strong>Avançar</strong>. Caso abra <em>Configurações avançadas</em>, use:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">OAuth Client ID</span>
                      <code className="font-mono font-bold text-slate-800">mexicano-gemini-client</code>
                    </div>
                    <button
                      onClick={() => handleCopy('mexicano-gemini-client', 'oauthClientId')}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      {copiedField === 'oauthClientId' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">OAuth Client Secret</span>
                      <code className="font-mono font-bold text-slate-800">{showApiKey ? apiKey : 'Usa sua MCP_API_KEY acima'}</code>
                    </div>
                    <button
                      onClick={() => handleCopy(apiKey, 'oauthClientSecret')}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer shrink-0"
                    >
                      {copiedField === 'oauthClientSecret' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase text-slate-500">
                    JSON Pronto para Clientes MCP Desktop (Antigravity / Claude / Cursor)
                  </label>
                  <button
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(
                          {
                            mcpServers: {
                              'mexicano-gestao-nautica': {
                                url: `${streamableHttpUrl}?apiKey=${apiKey}`,
                              },
                            },
                          },
                          null,
                          2
                        ),
                        'mcpJson'
                      )
                    }
                    className="text-[11px] font-bold text-[#186b77] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'mcpJson' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copiar JSON
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
{`{
  "mcpServers": {
    "mexicano-gestao-nautica": {
      "url": "${streamableHttpUrl}?apiKey=${showApiKey ? apiKey : '••••••••••••••••••••••••'}"
    }
  }
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Card 2: Travas de Segurança & Configuração do Gemini */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Travas de Segurança & Permissões do MCP
              </h2>

              <div className="space-y-3">
                {/* Toggle 1: MCP Ativo */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      {mcpAtivo ? <Unlock className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-red-600" />}
                      Acesso Externo ao Servidor MCP (/api/mcp)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Quando desativado, bloqueia imediatamente qualquer conexão externa mesmo com a API Key.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !mcpAtivo;
                      setMcpAtivo(next);
                      handleSaveConfig({ mcpAtivo: next });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      mcpAtivo ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        mcpAtivo ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 2: Permitir Escrita em Reservas */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Permitir Criar / Editar / Cancelar Reservas via IA
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Habilita as tools <code className="text-[10px]">criar_reserva</code>, <code className="text-[10px]">atualizar_reserva</code> e <code className="text-[10px]">cancelar_reserva</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !permitirReservas;
                      setPermitirReservas(next);
                      handleSaveConfig({ permitirReservas: next });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      permitirReservas ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        permitirReservas ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle 3: Permitir Envio de WhatsApp */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Permitir Envio de Mensagens WhatsApp via IA
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Habilita a tool <code className="text-[10px]">enviar_mensagem_whatsapp</code> (respeitando o Modo Sandbox: <strong>{sandboxAtiva ? 'Ativo' : 'Inativo'}</strong>).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !permitirWhatsapp;
                      setPermitirWhatsapp(next);
                      handleSaveConfig({ permitirWhatsapp: next });
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      permitirWhatsapp ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        permitirWhatsapp ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Configuração da API do Gemini */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#186b77]" />
                Configuração do Motor Gemini (Para o Chat Integrado)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Modelo Gemini
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado / Rápido)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Raciocínio Avançado)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    GEMINI_API_KEY ({hasGeminiKey ? `Atual: ${geminiKeyMasked}` : 'Não configurada'})
                  </label>
                  <input
                    type="password"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder={hasGeminiKey ? 'Digite para substituir a chave atual...' : 'Cole sua chave AIzaSy...'}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => handleSaveConfig()}
                  disabled={saving}
                  className="px-4 py-2 bg-[#186b77] hover:bg-[#135660] disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações Gemini'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════ ABA 3: TESTADOR DE TOOLS & AUDITORIA ═════════════════════ */}
      {activeSubTab === 'tools' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista das 22 Tools */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs max-h-[560px] overflow-y-auto space-y-1.5">
              <div className="px-2 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Catálogo ({tools.length} Tools)
              </div>
              {tools.map((t) => {
                const active = selectedTool?.name === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => {
                      setSelectedToolName(t.name);
                      setToolFormValues({});
                      setToolResult(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      active ? 'bg-[#186b77] text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold truncate">{t.name}</div>
                      <div className={`text-[10px] truncate ${active ? 'text-teal-100' : 'text-slate-400'}`}>
                        {t.category}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        t.mode === 'write'
                          ? active
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-amber-100 text-amber-800'
                          : active
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {t.mode === 'write' ? 'Ação' : 'Leitura'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Painel de Execução Manual da Tool Selecionada */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              {selectedTool && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-black text-slate-900">{selectedTool.name}</code>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            selectedTool.mode === 'write'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {selectedTool.mode === 'write' ? 'Escrita Controlada' : 'Somente Leitura (SELECT)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{selectedTool.description}</p>
                    </div>
                    <button
                      onClick={handleExecuteToolManual}
                      disabled={runningTool}
                      className="px-4 py-2 bg-[#186b77] hover:bg-[#135660] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {runningTool ? 'Executando...' : 'Executar Tool Agora'}
                    </button>
                  </div>

                  {/* Campos Dinâmicos de Parâmetros */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(selectedTool.inputSchema?.properties || {}).length === 0 ? (
                      <div className="col-span-2 text-xs text-slate-400 italic">
                        Esta ferramenta não exige parâmetros. Clique em "Executar Tool Agora".
                      </div>
                    ) : (
                      Object.entries(selectedTool.inputSchema.properties).map(([key, prop]: [string, any]) => {
                        const isRequired = selectedTool.inputSchema.required?.includes(key);
                        return (
                          <div key={key}>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              <span className="font-mono">{key}</span>
                              {isRequired && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <input
                              type={prop.type === 'number' ? 'number' : 'text'}
                              value={toolFormValues[key] ?? ''}
                              onChange={(e) => setToolFormValues((prev) => ({ ...prev, [key]: e.target.value }))}
                              placeholder={prop.description || key}
                              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186b77]"
                            />
                            {prop.description && (
                              <span className="block text-[10px] text-slate-400 mt-0.5">{prop.description}</span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Resultado JSON */}
                  {toolResult && (
                    <div className="pt-3">
                      <div className="text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                        Resposta em Tempo Real do Banco / MCP:
                      </div>
                      <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs max-h-72 overflow-y-auto">
                        {JSON.stringify(toolResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tabela de Auditoria de Execuções MCP */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#186b77]" />
              Últimas Execuções no Servidor MCP (Auditoria em Tempo Real)
            </h3>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Nenhuma ferramenta executada ainda nesta sessão.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400">
                      <th className="py-2 px-3">Horário</th>
                      <th className="py-2 px-3">Tool</th>
                      <th className="py-2 px-3">Origem</th>
                      <th className="py-2 px-3">Tempo</th>
                      <th className="py-2 px-3">Parâmetros</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentLogs.slice(0, 15).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{log.toolName}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {log.source === 'admin-chat'
                              ? 'Chat Gemini'
                              : log.source === 'admin-test'
                              ? 'Teste Admin'
                              : 'Cliente Externo'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{log.durationMs}ms</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                          {log.argsPreview}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {log.success ? 'OK' : 'Erro'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

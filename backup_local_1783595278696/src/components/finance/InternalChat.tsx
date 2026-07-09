import React, { useState, useEffect, useRef } from 'react';
import { Send, FilePlus, User, PlusCircle, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isSystemMessage: boolean;
}

export default function InternalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Kanban Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        setCurrentUser(JSON.parse(jsonPayload));
      } catch (e) {
        console.error(e);
      }
    }

    const fetchMessages = async () => {
      try {
        const res = await fetch('/api/chat/messages', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMessages();

    // Setup Socket.IO
    const newSocket = io(window.location.origin, {
      auth: { token }
    });

    newSocket.on('receiveMessage', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    
    socket.emit('sendMessage', { content: newMessage.trim() });
    setNewMessage('');
  };

  const handleCreateTaskClick = (msg: ChatMessage) => {
    setSelectedMessage(msg);
    setTaskTitle(`Tarefa sobre: ${msg.content.substring(0, 30)}...`);
    setTaskDesc(`Mensagem original de ${msg.senderName}:\n\n${msg.content}`);
    setIsTaskModalOpen(true);
  };

  const submitKanbanTask = async () => {
    if (!taskTitle.trim()) return;
    const token = localStorage.getItem('admin_token');
    
    const newTask = {
      id: `task_${Date.now()}`,
      titulo: taskTitle,
      descricao: taskDesc,
      status: 'pendente',
      prioridade: 'media',
      dataCriacao: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/financeiro/atividades/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'upsert', data: newTask })
      });
      if (res.ok) {
        setIsTaskModalOpen(false);
        setTaskTitle('');
        setTaskDesc('');
        // Optional: Send system message in chat
        if (socket) {
          socket.emit('sendMessage', { content: `[Sistema] Tarefa criada: ${taskTitle}` });
        }
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao criar tarefa');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          Chat Interno
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isMe = String(currentUser?.id) === String(msg.senderId) || String(currentUser?.username) === String(msg.senderId);
          const isSystem = msg.isSystemMessage || msg.content.startsWith('[Sistema]');
          
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full font-medium">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
              <span className="text-[10px] text-slate-400 font-semibold mb-1 ml-1">{msg.senderName}</span>
              <div className={`relative max-w-[85%] px-4 py-2 rounded-2xl ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                
                <button
                  onClick={() => handleCreateTaskClick(msg)}
                  className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-full shadow-sm`}
                  title="Criar tarefa no Kanban"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-colors flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                Criar Tarefa no Kanban
              </h2>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título da Tarefa</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitKanbanTask}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
              >
                Salvar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { backend } from '../services/supabaseBackend';
import { ChatMessage, User, ChatChannel } from '../types';
import { Send, Bot, Lock, Loader2, Sparkles, User as UserIcon, KeyRound, ExternalLink, Hash, Plus, Trash2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  messages: ChatMessage[];
  channels: ChatChannel[];
  currentUser: User;
  users: User[];
}

export const ChatView: React.FC<Props> = ({ messages, channels, currentUser, users }) => {
  const [input, setInput] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAiConfigured = backend.isGeminiConfigured();

  // Initialize selection using props, not backend directly
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  // Filter messages from props for current channel
  const activeMessages = selectedChannelId 
     ? messages.filter(m => m.channelId === selectedChannelId)
     : [];

  // Get current channel object from props
  const activeChannel = channels.find(c => c.id === selectedChannelId);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeChannel?.isLocked]); 

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedChannelId || activeChannel?.isLocked) return;

    const msg = input;
    setInput('');
    
    try {
        await backend.sendChatMessage(selectedChannelId, msg);
    } catch (err: any) {
        alert(err.message);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
     e.preventDefault();
     if(!newChannelName.trim()) return;
     try {
         await backend.createChatChannel(newChannelName);
         setNewChannelName('');
         setIsCreatingChannel(false);
     } catch (err: any) {
         alert(err.message);
     }
  };

  const handleDeleteChannel = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      try {
          await backend.deleteChatChannel(id);
          if (selectedChannelId === id) setSelectedChannelId(null);
      } catch(err: any) {
          alert(err.message);
      }
  };

  // Determine who is currently locking the chat
  const lockedByUser = activeChannel?.lockedByUserId 
    ? users.find(u => u.id === activeChannel.lockedByUserId) 
    : null;

  const isLockedByMe = activeChannel?.lockedByUserId === currentUser.id;

  if (!isAiConfigured) {
    return (
      <div className="flex flex-col h-full bg-[#02040a] relative overflow-hidden rounded-xl border border-slate-800 items-center justify-center p-8">
         <div className="bg-navy-800/50 border border-slate-700 p-8 rounded-2xl max-w-lg text-center shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
               <KeyRound className="text-white" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Ação Necessária na Vercel</h2>
            <p className="text-slate-400 mb-6">Configuração da API Key necessária para habilitar os chats.</p>
            <div className="bg-navy-900 border border-slate-800 rounded-lg p-4 text-left mb-6 font-mono text-sm">
               <code className="text-emerald-400 block break-all">VITE_API_KEY=sua_chave</code>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#02040a] rounded-xl border border-slate-800 overflow-hidden">
      
      {/* Sidebar - Channels */}
      <div className="w-64 bg-navy-900 border-r border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                 <MessageSquare size={16} /> Canais
              </h3>
              <button 
                 onClick={() => setIsCreatingChannel(!isCreatingChannel)}
                 className="text-slate-400 hover:text-white transition-colors"
              >
                 <Plus size={18} />
              </button>
          </div>

          {isCreatingChannel && (
             <form onSubmit={handleCreateChannel} className="p-2 border-b border-slate-800 bg-navy-800">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Nome do canal..."
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  className="w-full bg-navy-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-primary outline-none"
                />
             </form>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
             {channels.map(channel => (
                 <div 
                   key={channel.id}
                   onClick={() => setSelectedChannelId(channel.id)}
                   className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all group ${
                      selectedChannelId === channel.id 
                        ? 'bg-primary/10 text-primary border border-primary/20' 
                        : 'text-slate-400 hover:bg-navy-800 hover:text-slate-200'
                   }`}
                 >
                    <div className="flex items-center gap-2 truncate">
                       <Hash size={14} className="opacity-50 flex-shrink-0" />
                       <span className="text-sm font-medium truncate">{channel.name}</span>
                    </div>
                    {channel.isLocked && <Lock size={12} className="text-amber-500 animate-pulse" />}
                    
                    {/* Delete button (only show on hover) */}
                    {currentUser.role === 'admin' && (
                        <button 
                          onClick={(e) => handleDeleteChannel(e, channel.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity"
                        >
                           <Trash2 size={12} />
                        </button>
                    )}
                 </div>
             ))}
             {channels.length === 0 && (
                <div className="text-center p-4 text-slate-500 text-xs">
                   Nenhum canal criado.
                </div>
             )}
          </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
          {activeChannel ? (
            <>
              {/* Header */}
              <header className="bg-navy-900/90 backdrop-blur-md p-4 border-b border-slate-800 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <Sparkles className="text-white" size={20} />
                   </div>
                   <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                         #{activeChannel.name}
                      </h2>
                      <p className="text-xs text-slate-400">Gemini 3.0 Active</p>
                   </div>
                </div>
                
                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                   {activeChannel.isLocked ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 rounded-full border border-slate-700 animate-pulse">
                          <Loader2 size={14} className="animate-spin text-primary" />
                          <span className="text-xs text-slate-300">
                             {isLockedByMe ? "Gemini processando..." : `${lockedByUser?.name || 'Alguém'} digitando...`}
                          </span>
                      </div>
                   ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/20 rounded-full border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-xs text-emerald-400">Disponível</span>
                      </div>
                   )}
                </div>
              </header>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gradient-to-b from-[#02040a] to-[#0a0e17]">
                 <AnimatePresence initial={false}>
                    {activeMessages.map((msg, index) => {
                       const isUser = msg.role === 'user';
                       const isMe = msg.userId === currentUser.id;
                       
                       return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                          >
                             <div className={`flex max-w-[80%] md:max-w-[70%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className="flex-shrink-0 mt-1">
                                   {isUser ? (
                                      <img 
                                        src={msg.user?.avatar} 
                                        className="w-8 h-8 rounded-full border border-slate-700 object-cover bg-navy-900"
                                        title={msg.user?.name}
                                      />
                                   ) : (
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center border border-indigo-400/30 shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                                         <Bot size={18} className="text-white" />
                                      </div>
                                   )}
                                </div>

                                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                   <div className="flex items-center gap-2 mb-1 px-1">
                                      <span className="text-[10px] font-bold text-slate-400">
                                         {isUser ? (isMe ? 'Você' : msg.user?.name) : 'Gemini AI'}
                                      </span>
                                      <span className="text-[10px] text-slate-600">
                                         {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                   </div>
                                   
                                   <div className={`px-4 py-3 rounded-2xl shadow-md text-sm leading-relaxed whitespace-pre-wrap ${
                                      isUser 
                                        ? 'bg-navy-800 text-slate-200 border border-slate-700 rounded-tr-none'
                                        : 'bg-indigo-950/40 text-indigo-100 border border-indigo-500/20 rounded-tl-none'
                                   }`}>
                                      {msg.content}
                                   </div>
                                </div>
                             </div>
                          </motion.div>
                       );
                    })}
                 </AnimatePresence>

                 {/* Typing Indicator */}
                 {activeChannel.isLocked && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start w-full">
                       <div className="flex gap-3 max-w-[70%]">
                           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center border border-indigo-400/30 opacity-70">
                                <Bot size={18} className="text-white" />
                           </div>
                           <div className="bg-indigo-950/20 border border-indigo-500/10 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                           </div>
                       </div>
                    </motion.div>
                 )}
                 <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-navy-900 border-t border-slate-800 z-20">
                 <form onSubmit={handleSend} className="relative">
                    <input
                       type="text"
                       value={input}
                       onChange={(e) => setInput(e.target.value)}
                       disabled={activeChannel.isLocked}
                       placeholder={activeChannel.isLocked ? `Aguarde...` : `Mensagem para #${activeChannel.name}...`}
                       className={`w-full bg-navy-800 text-white rounded-xl pl-4 pr-12 py-3.5 shadow-inner transition-all outline-none ${
                          activeChannel.isLocked 
                             ? 'border border-slate-700 opacity-50 cursor-not-allowed placeholder-slate-500' 
                             : 'border border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-400'
                       }`}
                    />
                    
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                       {activeChannel.isLocked ? (
                          <Lock size={18} className="text-slate-500 mr-2" />
                       ) : (
                          <button 
                             type="submit" 
                             disabled={!input.trim()}
                             className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 text-white p-2 rounded-lg transition-all"
                          >
                             <Send size={18} />
                          </button>
                       )}
                    </div>
                 </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
               <MessageSquare size={48} className="mb-4 opacity-20" />
               <p>Selecione ou crie um canal para começar.</p>
            </div>
          )}
      </div>

    </div>
  );
};

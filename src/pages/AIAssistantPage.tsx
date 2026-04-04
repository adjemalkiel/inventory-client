import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Mic, 
  Paperclip, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw, 
  ChevronRight,
  Sparkles,
  AlertCircle,
  Package,
  History,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tableData?: {
    category: string;
    item: string;
    stock: string;
    status: 'success' | 'warning' | 'error';
    statusLabel: string;
  }[];
  recommendation?: string;
}

const suggestions = [
  {
    icon: Package,
    title: 'Inventaire Dépôt',
    prompt: 'Combien de perceuses au dépôt de Cotonou ?'
  },
  {
    icon: AlertCircle,
    title: 'Analyse de Rupture',
    prompt: 'Quels articles risquent une rupture ?'
  },
  {
    icon: LayoutDashboard,
    title: 'Résumé de Chantier',
    prompt: 'Résumé du chantier de Porto-Novo'
  }
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'user',
      content: "Peux-tu me faire un état des stocks pour le Chantier Horizon ? J'ai besoin de savoir s'il manque des EPI ou des consommables de fixation.",
      timestamp: new Date()
    },
    {
      id: '2',
      role: 'assistant',
      content: "Voici un résumé de l'état actuel pour le chantier Horizon. La situation est globalement sous contrôle, mais une attention est requise sur les consommables de perçage.",
      timestamp: new Date(),
      tableData: [
        { category: 'EPI', item: 'Casques Type B', stock: '24 unités', status: 'success', statusLabel: 'Suffisant' },
        { category: 'Fixation', item: 'Chevilles 8mm', stock: '150 unités', status: 'warning', statusLabel: 'Bas' },
        { category: 'Consommable', item: 'Forets Béton 6mm', stock: '2 unités', status: 'error', statusLabel: 'Critique' }
      ],
      recommendation: "Commandez 20 forets béton 6mm dès aujourd'hui pour éviter un arrêt du chantier vendredi. Le fournisseur Habit-Pro a du stock disponible en livraison 24h."
    }
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Je traite votre demande concernant l'inventaire. Un instant s'il vous plaît...",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col relative overflow-hidden">
      {/* Header Info */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <nav className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
          <span>SYSTÈME</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-primary">ASSISTANT IA</span>
        </nav>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2 text-emerald-600">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Statut: Opérationnel</span>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-10 pb-8 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="max-w-4xl mx-auto w-full text-center py-12">
            <div className="w-20 h-20 bg-primary-fixed rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
              <Bot className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-5xl font-headline font-bold text-primary tracking-tight mb-4">Assistant IA</h3>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed mb-12">
              Optimisez la logistique de vos chantiers. Posez-moi des questions sur vos stocks, vos livraisons ou l'état de vos équipements.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {suggestions.map((s, i) => (
                <button 
                  key={i}
                  onClick={() => setInput(s.prompt)}
                  className="p-6 bg-white text-left rounded-2xl border border-slate-100 shadow-sm hover:border-primary-fixed hover:shadow-md transition-all group"
                >
                  <s.icon className="w-6 h-6 text-primary mb-4 group-hover:scale-110 transition-transform" />
                  <p className="font-headline font-bold text-primary text-sm mb-2">{s.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed italic">"{s.prompt}"</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full space-y-10">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={cn(
                  "flex gap-4",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                )}
                
                <div className={cn(
                  "flex-1 max-w-[85%] space-y-4",
                  msg.role === 'user' && "flex flex-col items-end"
                )}>
                  <div className={cn(
                    "p-6 rounded-2xl shadow-sm border",
                    msg.role === 'user' 
                      ? "bg-primary text-white border-primary rounded-tr-none" 
                      : "bg-white text-primary border-slate-100 rounded-tl-none"
                  )}>
                    {msg.role === 'assistant' && (
                      <p className="font-headline font-bold text-primary mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary-fixed-dim" />
                        Analyse intelligente
                      </p>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>

                    {msg.tableData && (
                      <div className="mt-6 overflow-hidden bg-slate-50 rounded-xl border border-slate-100">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-100/50 text-slate-500 uppercase tracking-wider font-bold">
                              <th className="px-4 py-3">Catégorie</th>
                              <th className="px-4 py-3">Article</th>
                              <th className="px-4 py-3">Stock</th>
                              <th className="px-4 py-3">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/50">
                            {msg.tableData.map((row, i) => (
                              <tr key={i}>
                                <td className="px-4 py-3 font-bold text-primary">{row.category}</td>
                                <td className="px-4 py-3 text-slate-600">{row.item}</td>
                                <td className="px-4 py-3 text-slate-600">{row.stock}</td>
                                <td className="px-4 py-3">
                                  <span className={cn(
                                    "inline-flex items-center gap-1.5 font-bold",
                                    row.status === 'success' ? "text-emerald-600" :
                                    row.status === 'warning' ? "text-amber-600" : "text-error"
                                  )}>
                                    <div className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      row.status === 'success' ? "bg-emerald-600" :
                                      row.status === 'warning' ? "bg-amber-600" : "bg-error"
                                    )} />
                                    {row.statusLabel}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {msg.recommendation && (
                      <div className="mt-6 p-4 bg-primary-fixed/20 rounded-xl border-l-4 border-primary">
                        <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-widest">Recommandation IA</p>
                        <p className="text-sm text-primary leading-relaxed font-medium">
                          {msg.recommendation}
                        </p>
                      </div>
                    )}
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-4 text-slate-400 px-2">
                      <button className="hover:text-primary transition-colors"><ThumbsUp className="w-4 h-4" /></button>
                      <button className="hover:text-primary transition-colors"><ThumbsDown className="w-4 h-4" /></button>
                      <button className="hover:text-primary transition-colors ml-auto flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Régénérer</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 pt-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent">
        <div className="max-w-4xl mx-auto w-full">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary-container rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition duration-500" />
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex items-end gap-2">
              <button className="p-3 text-slate-400 hover:text-primary transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium py-3 resize-none placeholder:text-slate-400 min-h-[44px] max-h-32"
                placeholder="Posez une question à votre copilote d'inventaire..."
                rows={1}
              />
              <div className="flex items-center gap-1 p-1">
                <button className="p-3 text-slate-400 hover:text-primary transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95",
                    input.trim() ? "bg-primary text-white hover:bg-primary-container" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">
            L'IA peut faire des erreurs. Vérifiez les informations critiques.
          </p>
        </div>
      </div>
    </div>
  );
}

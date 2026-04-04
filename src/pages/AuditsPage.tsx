import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Bell, 
  ChevronRight, 
  MapPin, 
  Save, 
  CheckCircle2, 
  Timer, 
  Filter, 
  QrCode, 
  Minus, 
  Plus, 
  AlertTriangle,
  ChevronDown, 
  XCircle, 
  Send,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  reference: string;
  theoreticalQty: number;
  actualQty: number | null;
}

const initialItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Ciment Portland CEM I 42,5 R',
    description: 'Lafarge Holcim - Sac 35kg',
    reference: '#FR-882-CIM',
    theoreticalQty: 450,
    actualQty: 450
  },
  {
    id: '2',
    name: 'Perforateur Burineur SDS-Max',
    description: 'Bosch Professional GBH 8-45 DV',
    reference: '#OUT-12-PERF',
    theoreticalQty: 12,
    actualQty: 10
  },
  {
    id: '3',
    name: 'Treillis Soudé PAFC',
    description: 'Panneau 2.40m x 6.00m',
    reference: '#FER-550-TR',
    theoreticalQty: 85,
    actualQty: null
  },
  {
    id: '4',
    name: 'Mortier de jointoiement gris',
    description: 'Weber Joint - Sac 25kg',
    reference: '#FR-442-MOR',
    theoreticalQty: 200,
    actualQty: 205
  }
];

export default function AuditsPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [time, setTime] = useState(5052); // 01:24:12 in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const updateQty = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const current = item.actualQty ?? item.theoreticalQty;
        return { ...item, actualQty: Math.max(0, current + delta) };
      }
      return item;
    }));
  };

  const handleInputChange = (id: string, value: string) => {
    const num = parseInt(value);
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, actualQty: isNaN(num) ? null : num };
      }
      return item;
    }));
  };

  const verifiedCount = items.filter(item => item.actualQty !== null).length;
  const progress = (verifiedCount / items.length) * 100;

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">
            <span>INVENTAIRES</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">VÉRIFICATION EN COURS</span>
          </nav>
          <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">Vérification de Stock</h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary-fixed text-primary rounded-full text-xs font-bold">
              <MapPin className="w-3.5 h-3.5" />
              Dépôt Cotonou - Zone A
            </div>
            <span className="text-slate-500 text-sm">Lancé par J. Dossou le 24 Oct 2023</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-6 py-3 rounded-xl border border-slate-200 font-headline font-bold text-sm text-primary hover:bg-slate-50 transition-all">
            Enregistrer
          </button>
          <button className="px-6 py-3 rounded-xl bg-primary text-white font-headline font-bold text-sm shadow-lg hover:bg-primary-container transition-all flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Valider les écarts
          </button>
        </div>
      </div>

      {/* Stats & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-white p-8 rounded-2xl shadow-sm flex flex-col justify-between border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Avancement global</p>
              <h3 className="text-2xl font-headline font-bold text-primary">
                {verifiedCount} articles vérifiés <span className="text-slate-400 font-medium text-lg">sur {items.length}</span>
              </h3>
            </div>
            <div className="text-right">
              <span className="text-4xl font-headline font-extrabold text-primary">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-700" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="bg-primary p-8 rounded-2xl shadow-sm text-white flex flex-col justify-center items-center text-center">
          <Timer className="w-10 h-10 mb-3 text-primary-fixed" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Temps écoulé</p>
          <span className="text-3xl font-headline font-bold">{formatTime(time)}</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl text-sm font-bold shadow-sm border border-slate-100">
            <Filter className="w-4 h-4 text-primary" />
            Tous les articles
          </button>
          <button className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-500 transition-all">
            <AlertTriangle className="w-4 h-4" />
            Écarts uniquement
          </button>
        </div>
        <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
          <QrCode className="w-5 h-5" />
          Scanner un article
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Article</th>
                <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Référence</th>
                <th className="px-6 py-5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quantité Théorique</th>
                <th className="px-6 py-5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quantité Constatée</th>
                <th className="px-8 py-5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const diff = item.actualQty !== null ? item.actualQty - item.theoreticalQty : null;
                return (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors duration-200">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-headline font-bold text-primary">{item.name}</span>
                        <span className="text-xs text-slate-500">{item.description}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 font-medium text-sm text-slate-500">{item.reference}</td>
                    <td className="px-6 py-6 text-center font-headline font-bold text-primary">{item.theoreticalQty}</td>
                    <td className="px-6 py-6 text-center">
                      <div className="inline-flex items-center gap-3">
                        <button 
                          onClick={() => updateQty(item.id, -1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input 
                          className={cn(
                            "w-16 border-none bg-slate-50 rounded-lg text-center font-bold text-sm focus:ring-primary",
                            item.actualQty === null && "italic text-slate-400"
                          )}
                          type="number" 
                          value={item.actualQty ?? ''}
                          onChange={(e) => handleInputChange(item.id, e.target.value)}
                          placeholder="--"
                        />
                        <button 
                          onClick={() => updateQty(item.id, 1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {item.actualQty === null ? (
                        <span className="text-xs italic text-slate-400">En attente</span>
                      ) : (
                        <span className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold",
                          diff === 0 ? "bg-slate-100 text-slate-500" :
                          diff! > 0 ? "bg-secondary-container text-on-secondary-container" :
                          "bg-error-container text-on-error-container"
                        )}>
                          {diff! > 0 ? `+${diff}` : diff}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-10 py-8 bg-slate-50/30 flex justify-center border-t border-slate-100">
          <button className="text-primary font-bold text-sm hover:underline flex items-center gap-2">
            Afficher plus d'articles
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-4">
        <button className="flex items-center gap-2 text-error font-bold text-sm px-4 py-2 hover:bg-error/5 rounded-lg transition-colors">
          <XCircle className="w-5 h-5" />
          Abandonner l'inventaire
        </button>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dernière sauvegarde automatique</span>
            <span className="text-xs font-bold text-primary">Aujourd'hui à 14:32</span>
          </div>
          <button className="px-8 py-4 bg-primary text-white rounded-xl shadow-lg font-headline font-bold tracking-wide flex items-center gap-3 hover:bg-primary-container transition-all active:scale-95">
            Terminer et valider l'inventaire
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating AI Assistant Button */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50">
        <Bot className="w-7 h-7" />
      </button>
    </div>
  );
}

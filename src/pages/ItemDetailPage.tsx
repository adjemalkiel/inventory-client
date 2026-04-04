import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit3, 
  ArrowLeftRight, 
  AlertTriangle, 
  History, 
  MapPin, 
  Info, 
  Package, 
  Calendar, 
  ShieldCheck, 
  Truck, 
  Building2, 
  PlusCircle,
  Bot,
  Sparkles,
  ChevronRight,
  ExternalLink,
  FileText,
  User,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock data matching the design
  const item = {
    id: id || 'REF-BS-18V-2023',
    name: 'Perceuse Bosch 18V',
    reference: 'REF-BS-18V-2023',
    description: 'Outil haute performance professionnel',
    category: 'Outillage',
    subcategory: 'Outillage Électroportatif',
    brand: 'Bosch Professional',
    purchaseDate: '12/03/2023',
    warranty: '24 Mois',
    supplier: 'Materiel-Direct S.A.S',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVpoW9sGjULK1b5ZP_YTeHK4tOcXSMrCjPx7sppZZuHXep7ofuXktvsXY9FXHHHo0z0kwWWYe_I1fVLaBjr_YCxBu-WyWv2r6awvInI9Or-Wwe-1A4cT8lavv4_hVobIVPBDBlf52lMHaiBzShQ8VwdKmrF1DKT4Q9ndBGwlkuw3BDm8AWumBIp4FjFJ04RW5AKSuqDjqBk_qEcYpseLeZ6Rwmaq2mhDEi_jej3o7sviDwbFDLam_7mID5foKZted-iWUUaInsIRNV',
    stocks: [
      { location: 'Dépôt Cotonou', sub: 'Zone A - Étagère 04', qty: 10 },
      { location: 'Chantier Porto-Novo', sub: 'Équipe Structure', qty: 5 },
    ],
    history: [
      { date: '14 Oct 2023', type: 'TRANSFERT', from: 'Dépôt Cotonou', to: 'Chantier Porto-Novo', qty: -2, typeColor: 'bg-secondary-container text-on-secondary-container' },
      { date: '02 Oct 2023', type: 'RÉCEPTION', from: 'Fournisseur Cotonou', to: 'Dépôt Cotonou', qty: 12, typeColor: 'bg-primary-fixed text-primary' },
      { date: '28 Sep 2023', type: 'PERTE', from: 'Chantier Porto-Novo', to: '-', qty: -1, typeColor: 'bg-error-container text-on-error-container' },
    ],
    assignments: [
      { name: 'Porto-Novo', date: '12/10' }
    ]
  };

  const totalStock = item.stocks.reduce((acc, s) => acc + s.qty, 0);

  return (
    <div className="space-y-10 pb-20">
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            <Link to="/inventory" className="hover:text-primary transition-colors">Inventaire</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-primary cursor-pointer">{item.subcategory}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">Détail Article</span>
          </nav>
          <h2 className="text-4xl font-headline font-extrabold text-primary tracking-tight">{item.name}</h2>
          <p className="text-slate-500 mt-1 font-medium">{item.reference} • {item.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white text-primary font-bold rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
            <Edit3 className="w-5 h-5" />
            Modifier
          </button>
          <button 
            onClick={() => navigate('/inventory/new-movement')}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-container transition-all active:scale-95"
          >
            <ArrowLeftRight className="w-5 h-5" />
            Enregistrer un mouvement
          </button>
          <button className="flex items-center justify-center w-12 h-12 text-error bg-error-container/10 border border-error/10 hover:bg-error-container/20 rounded-xl transition-all" title="Déclarer une perte">
            <AlertTriangle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Media & AI */}
        <div className="lg:col-span-4 space-y-8">
          {/* Product Image */}
          <div className="bg-white rounded-2xl overflow-hidden aspect-square flex items-center justify-center shadow-sm border border-slate-100 p-12 group">
            <img 
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
              src={item.image} 
              alt={item.name}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* AI Insights Block */}
          <div className="bg-primary text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Bot className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Sparkles className="w-5 h-5 text-primary-fixed" />
              </div>
              <h3 className="font-headline font-bold text-lg">Assistant Prédictif IA</h3>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-fixed mb-1">Analyse de Stock</p>
                <p className="text-sm font-medium leading-relaxed">
                  Prévision : Risque de rupture estimé à <span className="text-primary-fixed font-bold">15%</span> sous 10 jours.
                </p>
              </div>
              <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-fixed mb-1">Recommandation</p>
                <p className="text-sm font-medium leading-relaxed">
                  Prévoir un réapprovisionnement prioritaire pour le <span className="underline decoration-primary-fixed/30 underline-offset-4 cursor-pointer hover:text-primary-fixed transition-colors">chantier Nova</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Data & Tables */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Stock by Location */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-primary">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Stock par lieu
              </h3>
              <div className="space-y-6">
                {item.stocks.map((stock, i) => (
                  <div key={i} className="flex items-end justify-between border-b border-slate-50 pb-4 last:border-0">
                    <div>
                      <p className="font-headline font-bold text-primary">{stock.location}</p>
                      <p className="text-xs text-slate-500 font-medium">{stock.sub}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-headline font-extrabold text-primary">{stock.qty.toString().padStart(2, '0')}</p>
                      <p className="text-[10px] font-bold uppercase text-slate-400">Unités</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-headline font-extrabold text-primary">{totalStock}</span>
                  <span className="text-sm font-bold text-slate-400">Total disponible</span>
                </div>
              </div>
            </div>

            {/* General Attributes */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Informations générales
              </h3>
              <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Catégorie</p>
                  <p className="text-sm font-bold text-primary">{item.category}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Marque</p>
                  <p className="text-sm font-bold text-primary">{item.brand}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Date d'achat</p>
                  <p className="text-sm font-bold text-primary">{item.purchaseDate}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Garantie</p>
                  <p className="text-sm font-bold text-primary">{item.warranty}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Fournisseur</p>
                  <p className="text-sm font-bold text-primary">{item.supplier}</p>
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <History className="w-4 h-4" />
                Historique des mouvements
              </h3>
              <button className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                Voir tout l'historique
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400">Date</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400">Type</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400">De</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400">Vers</th>
                    <th className="px-8 py-4 text-[10px] font-bold uppercase text-slate-400 text-right">Qté</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {item.history.map((mv, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-8 py-4 text-sm font-bold text-primary">{mv.date}</td>
                      <td className="px-8 py-4">
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase", mv.typeColor)}>
                          {mv.type}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-sm text-slate-500 font-medium">{mv.from}</td>
                      <td className="px-8 py-4 text-sm text-slate-500 font-medium">{mv.to}</td>
                      <td className={cn(
                        "px-8 py-4 text-sm font-extrabold text-right font-mono",
                        mv.qty > 0 ? "text-emerald-600" : "text-error"
                      )}>
                        {mv.qty > 0 ? `+${mv.qty}` : mv.qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Job Assignments */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Affectations chantier actives
            </h3>
            <div className="flex flex-wrap gap-4">
              {item.assignments.map((as, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 min-w-[240px] hover:border-primary transition-colors cursor-pointer group">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{as.name}</p>
                    <p className="text-xs text-slate-500 font-medium">Affecté le {as.date}</p>
                  </div>
                </div>
              ))}
              <button className="flex items-center gap-3 p-4 border-2 border-slate-100 border-dashed rounded-xl min-w-[240px] justify-center text-slate-400 hover:text-primary hover:border-primary hover:bg-slate-50 transition-all group">
                <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold">Affecter à un chantier</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

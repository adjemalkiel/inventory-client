import React, { useEffect, useState } from 'react';
import { 
  Download, 
  Upload, 
  Plus, 
  Search, 
  AlertTriangle, 
  MapPin, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  Hammer,
  Package as PackageIcon,
  Palette,
  HardHat,
  TrendingUp,
  Bell,
  History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { apiServices } from '@/lib/api';
import type { Item, StockBalance, StorageLocation } from '@/types/api';

const mockInventory = [
  { ref: 'REF-09421', name: 'Bosch 18V - Perforateur', cat: 'Matériel', sub: 'Outillage électroportatif', location: 'Dépôt Cotonou', qty: 15, threshold: 5, status: 'Disponible', statusColor: 'text-green-700 bg-green-50 border-green-100', dotColor: 'bg-green-500', icon: Hammer, last: 'Il y a 2h' },
  { ref: 'REF-88210', name: 'Ciment CPJ 35', cat: 'Consommable', sub: 'Sac de 35kg - Lafarge', location: 'Dépôt Cotonou', qty: 2, threshold: 20, status: 'Stock faible', statusColor: 'text-orange-700 bg-orange-50 border-orange-100', dotColor: 'bg-orange-500', icon: PackageIcon, last: 'Hier, 16:45' },
  { ref: 'REF-11492', name: 'Peinture Glycéro Blanche', cat: 'Consommable', sub: 'Pot 10L - Tollens', location: 'Chantier Parakou', qty: 0, threshold: 5, status: 'Rupture', statusColor: 'text-red-700 bg-red-50 border-red-100', dotColor: 'bg-red-500', icon: Palette, last: '22 Oct. 2023' },
  { ref: 'REF-44501', name: 'Gants de protection cuir', cat: 'EPI', sub: 'EPI - Taille L', location: 'Dépôt Cotonou', qty: 42, threshold: 10, status: 'Disponible', statusColor: 'text-green-700 bg-green-50 border-green-100', dotColor: 'bg-green-500', icon: HardHat, last: 'Il y a 45min' },
];

export default function InventoryPage() {
  const [inventoryRows, setInventoryRows] = useState(mockInventory);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiServices.items.list(),
      apiServices.stockBalances.list(),
      apiServices.storageLocations.list(),
    ])
      .then(([items, balances, locations]) => {
        if (!isMounted || items.length === 0) return;
        const rows = buildInventoryRows(items, balances, locations);
        setInventoryRows(rows.length > 0 ? rows : mockInventory);
      })
      .catch((error) => {
        console.error('Failed to load inventory data:', error);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-10">
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">Inventaire du Chantier</h2>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm md:text-base">Gérez l'ensemble de votre parc matériel et consommables. Visualisez l'état des stocks en temps réel sur tous les dépôts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 text-primary bg-white border border-outline-variant/30 rounded-xl font-semibold text-sm hover:bg-surface-container-low transition-all duration-400">
            <Download className="w-4 h-4 md:w-5 md:h-5" />
            <span>Exporter</span>
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 text-primary bg-white border border-outline-variant/30 rounded-xl font-semibold text-sm hover:bg-surface-container-low transition-all duration-400">
            <Upload className="w-4 h-4 md:w-5 md:h-5" />
            <span>Importer</span>
          </button>
          <Link to="/inventory/new" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-white rounded-xl font-semibold text-sm shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-400">
            <Plus className="w-5 h-5" />
            <span>Ajouter un article</span>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 bg-surface-container-low/50 p-4 md:p-6 rounded-2xl">
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Catégorie</label>
          <select className="w-full bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-fixed shadow-sm">
            <option>Toutes les catégories</option>
            <option>Outillage</option>
            <option>Matériel</option>
            <option>Consommable</option>
            <option>EPI</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Lieu de stockage</label>
          <select className="w-full bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-fixed shadow-sm">
            <option>Tous les lieux</option>
            <option>Dépôt Cotonou</option>
            <option>Chantier Parakou</option>
            <option>Atelier Porto-Novo</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest px-1">Statut</label>
          <select className="w-full bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-fixed shadow-sm">
            <option>Tous les statuts</option>
            <option>Disponible</option>
            <option>Stock faible</option>
            <option>Rupture</option>
          </select>
        </div>
        <div className="flex items-end">
          <button className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-error-container text-on-error-container rounded-xl font-bold text-xs uppercase tracking-tighter hover:bg-error/10 transition-colors">
            <AlertTriangle className="w-4 h-4" />
            Voir le stock critique
          </button>
        </div>
      </section>

      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-surface-container-high">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container-high/40">
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">Référence</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">Article</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">Catégorie</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">Lieu</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest text-right">Quantité</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest text-right">Seuil</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest text-center">Statut</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-primary-fixed-variant uppercase tracking-widest">Dernier mouvement</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-dim/10">
              {inventoryRows.map((item, i) => (
                <tr key={i} className="hover:bg-surface-container-low transition-colors duration-200 group">
                  <td className="px-6 py-5">
                    <span className="font-mono text-xs font-semibold text-slate-500">{item.ref}</span>
                  </td>
                  <td className="px-6 py-5">
                    <Link to={`/inventory/${item.ref}`} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-primary group-hover:underline">{item.name}</p>
                        <p className="text-[11px] text-slate-400">{item.sub}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2 py-1 bg-surface-container-high rounded-full text-[10px] font-bold text-slate-600 uppercase">{item.cat}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-sm">{item.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right font-headline font-bold text-primary">{item.qty}</td>
                  <td className="px-6 py-5 text-right text-sm text-slate-400">{item.threshold}</td>
                  <td className="px-6 py-5">
                    <div className="flex justify-center">
                      <span className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border",
                        item.statusColor
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", item.dotColor)}></span>
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-500 italic">{item.last}</td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-primary transition-all">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-low/30 border-t border-surface-dim/10">
          <p className="text-xs text-slate-500 font-medium">Affichage de <span className="font-bold text-primary">1-4</span> sur <span className="font-bold text-primary">1,240</span> articles</p>
          <div className="flex items-center gap-2">
            <button className="p-1 text-slate-400 hover:text-primary disabled:opacity-30" disabled>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-white text-xs font-bold">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container text-xs font-medium text-slate-600">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container text-xs font-medium text-slate-600">3</button>
            </div>
            <button className="p-1 text-slate-400 hover:text-primary">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="bg-primary p-6 rounded-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-on-primary-container text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Valeur totale stock</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-white font-headline">93 703 250 FCFA</h3>
            <p className="text-white/60 text-xs mt-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              +4.2% par rapport au mois dernier
            </p>
          </div>
          <History className="absolute -right-4 -bottom-4 text-9xl text-white/5 w-24 md:w-32 h-24 md:h-32" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-surface-container-high relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Articles en alerte</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-error font-headline">18 Articles</h3>
            <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
              <Bell className="w-4 h-4" />
              Nécessite une commande urgente
            </p>
          </div>
          <AlertTriangle className="absolute -right-4 -bottom-4 text-9xl text-error/5 w-24 md:w-32 h-24 md:h-32" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-surface-container-high relative overflow-hidden group sm:col-span-2 lg:col-span-1">
          <div className="relative z-10">
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-2">Activité (24h)</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-primary font-headline">56 Mvts</h3>
            <p className="text-slate-400 text-xs mt-2 flex items-center gap-1">
              <History className="w-4 h-4 text-secondary" />
              Dernière mise à jour : 14:02
            </p>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 text-9xl text-primary/5 w-24 md:w-32 h-24 md:h-32" />
        </div>
      </section>
    </div>
  );
}

function buildInventoryRows(
  items: Item[],
  balances: StockBalance[],
  locations: StorageLocation[],
) {
  const locationNameById = new Map(locations.map((location) => [location.id, location.name]));
  return items.map((item) => {
    const itemBalances = balances.filter((balance) => balance.item === item.id);
    const totalQty = itemBalances.reduce(
      (sum, balance) => sum + Number(balance.quantity || 0),
      0,
    );
    const firstLocation = itemBalances[0]
      ? locationNameById.get(itemBalances[0].storage_location) ?? 'N/A'
      : 'N/A';
    const minStock = Number(item.min_stock || 0);
    const status =
      totalQty <= 0 ? 'Rupture' : totalQty <= minStock ? 'Stock faible' : 'Disponible';
    const statusColor =
      status === 'Rupture'
        ? 'text-red-700 bg-red-50 border-red-100'
        : status === 'Stock faible'
          ? 'text-orange-700 bg-orange-50 border-orange-100'
          : 'text-green-700 bg-green-50 border-green-100';
    const dotColor =
      status === 'Rupture'
        ? 'bg-red-500'
        : status === 'Stock faible'
          ? 'bg-orange-500'
          : 'bg-green-500';
    return {
      ref: item.sku,
      name: item.name,
      cat: item.subcategory_label || 'Article',
      sub: item.description || 'Sans description',
      location: firstLocation,
      qty: totalQty,
      threshold: minStock,
      status,
      statusColor,
      dotColor,
      icon: Hammer,
      last: 'API',
    };
  });
}

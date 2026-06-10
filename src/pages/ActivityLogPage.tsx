import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, History } from 'lucide-react';
import { apiServices } from '@/lib/api';
import type { ActivityEventItem, ActivityEventType } from '@/types/api';

const TYPE_META: Record<ActivityEventType, { label: string; color: string; bg: string; icon: string }> = {
  movement: { label: 'Mouvements', color: 'text-blue-600', bg: 'bg-blue-50', icon: '🔵' },
  item: { label: 'Articles', color: 'text-amber-600', bg: 'bg-amber-50', icon: '🟡' },
  project: { label: 'Chantiers', color: 'text-orange-600', bg: 'bg-orange-50', icon: '🟠' },
  user: { label: 'Utilisateurs', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '🟢' },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days}j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function ActivityLogPage() {
  const [events, setEvents] = useState<ActivityEventItem[]>([]);
  const [typeFilter, setTypeFilter] = useState<ActivityEventType | ''>('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiServices.activityLog.list({
        limit: 100,
        ...(typeFilter ? { type: typeFilter } : {}),
      });
      setEvents(res.results);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-8 pb-10">
      <header className="mb-8">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Supervision</p>
        <h2 className="text-4xl font-headline font-bold text-primary tracking-tight">Journal d'activité</h2>
        <p className="text-on-surface-variant font-body mt-2 leading-relaxed max-w-2xl">
          Consultez la trace des dernières actions réalisées dans Bâtir Pro : mouvements, articles, chantiers et utilisateurs.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTypeFilter('')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
            typeFilter === '' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
          }`}
        >
          Tous
        </button>
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <button
            key={type}
            type="button"
            onClick={() => setTypeFilter(type as ActivityEventType)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              typeFilter === type ? `${meta.bg} ${meta.color} border-current` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* Events */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-slate-500">Chargement...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <History className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm font-medium">Aucune activité récente trouvée.</p>
          <p className="text-xs mt-1">Les actions réalisées apparaîtront ici automatiquement.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev, idx) => {
            const meta = TYPE_META[ev.type];
            return (
              <div
                key={`${ev.object_id}-${idx}`}
                className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${meta.bg} shrink-0`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-bold text-sm text-primary truncate">{ev.label}</span>
                      <span className="text-xs text-slate-400 shrink-0">{relativeTime(ev.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Réf : {ev.ref} — {ev.detail}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Par : {ev.actor}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

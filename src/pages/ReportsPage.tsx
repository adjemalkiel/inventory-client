import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Mail,
  Package,
  TrendingUp,
  ArrowLeftRight,
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Truck,
  Factory,
  X,
  Loader2,
  Check,
} from 'lucide-react';
import { apiServices } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { useCurrentUser } from '@/context/CurrentUserContext';
import type { Project } from '@/types/api';

const BASE_URL = '/api/v1/';

function useProjects() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  React.useEffect(() => {
    apiServices.projects.list({ status: 'en_cours' }).then(setProjects).catch(() => {});
  }, []);
  return projects;
}

async function downloadFile(url: string, filename: string) {
  const token = getAccessToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

interface EmailModalProps {
  reportType: string;
  reportLabel: string;
  params?: Record<string, string | number>;
  onClose: () => void;
}

function EmailModal({ reportType, reportLabel, params, onClose }: EmailModalProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: boolean } | null>(null);

  const handleSend = async () => {
    if (!email) return;
    setSending(true);
    try {
      const res = await apiServices.reports.sendByEmail({
        report_type: reportType as 'stock_valuation',
        recipient_email: email,
        params,
      });
      setResult({ sent: res.sent });
    } catch {
      setResult({ sent: false });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-on-surface">Envoyer « {reportLabel} »</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className={`p-4 rounded-xl text-center ${result.sent ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {result.sent ? (
              <><Check className="w-6 h-6 mx-auto mb-2" /> Email envoyé avec succès</>
            ) : (
              <><AlertTriangle className="w-6 h-6 mx-auto mb-2" /> Erreur d'envoi</>
            )}
            <button onClick={onClose} className="mt-3 px-4 py-2 bg-white border rounded-lg text-sm font-medium">
              Fermer
            </button>
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Adresse e-mail du destinataire
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="utilisateur@exemple.com"
              className="w-full px-4 py-2.5 border border-outline-variant/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex items-center justify-end gap-3 mt-5">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-lg">
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={!email || sending}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                Envoyer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface ReportCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}

function ReportCard({ icon: Icon, title, description, children }: ReportCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-5 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-on-surface text-sm">{title}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex-1" />
      <div className="mt-4 pt-3 border-t border-outline-variant/15">
        {children}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant?: 'default' | 'secondary';
}

function ActionButton({ icon: Icon, label, onClick, loading, variant = 'default' }: ActionButtonProps) {
  const base = variant === 'secondary'
    ? 'text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-low'
    : 'text-primary border-primary/20 hover:bg-primary/5';
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${base} disabled:opacity-50`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}

export default function ReportsPage() {
  const { hasPermission } = useCurrentUser();
  const projects = useProjects();
  const [loading, setLoading] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<{ type: string; label: string; params?: Record<string, string | number> } | null>(null);

  const [selectedProject, setSelectedProject] = useState('');
  const [movDateFrom, setMovDateFrom] = useState('');
  const [movDateTo, setMovDateTo] = useState('');
  const [movType, setMovType] = useState('');
  const [movProject, setMovProject] = useState('');
  const [consumptionProject, setConsumptionProject] = useState('');
  const [transferDateFrom, setTransferDateFrom] = useState('');
  const [transferDateTo, setTransferDateTo] = useState('');
  const [supplierDateFrom, setSupplierDateFrom] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
  );
  const [supplierDateTo, setSupplierDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [consumptionYear, setConsumptionYear] = useState(new Date().getFullYear());

  const handleDownload = async (key: string, url: string, filename: string) => {
    setLoading(key);
    try {
      await downloadFile(url, filename);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setLoading(null);
    }
  };

  const handlePrint = () => window.print();

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Print-only header */}
      <div className="print-header">
        <h1>Bâtir Pro — Rapports</h1>
        <p>Généré le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      <div data-print-hidden>
        <h2 className="text-2xl font-bold text-on-surface">Rapports & Exports</h2>
        <p className="text-on-surface-variant mt-1 text-sm">
          Générez et exportez vos rapports métier. Téléchargez en Excel, CSV, imprimez ou envoyez par email.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-print-hidden>
        {/* R1 — Inventaire valorisé */}
        {hasPermission('reports.financial') && (
          <ReportCard icon={Package} title="Inventaire valorisé" description="État des stocks avec valorisation (méthode active)">
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={FileSpreadsheet}
                label="Excel"
                loading={loading === 'r1'}
                onClick={() => handleDownload('r1', `${BASE_URL}items/stock-valuation/export/`, `inventaire-valorise-${today}.xlsx`)}
              />
              <ActionButton icon={Printer} label="Imprimer" onClick={handlePrint} variant="secondary" />
              <ActionButton
                icon={Mail}
                label="Email"
                variant="secondary"
                onClick={() => setEmailModal({ type: 'stock_valuation', label: 'Inventaire valorisé' })}
              />
            </div>
          </ReportCard>
        )}

        {/* R2 — Coût chantier */}
        {hasPermission('reports.cost') && (
          <ReportCard icon={TrendingUp} title="Coût chantier" description="Détail des coûts et budget par chantier">
            <div className="mb-3">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-outline-variant/30 rounded-lg bg-white"
              >
                <option value="">Sélectionner un chantier…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={FileSpreadsheet}
                label="Excel"
                loading={loading === 'r2'}
                onClick={() => {
                  if (!selectedProject) return;
                  handleDownload('r2', `${BASE_URL}projects/${selectedProject}/cost-breakdown/export/`, `cout-chantier-${today}.xlsx`);
                }}
              />
              <ActionButton icon={Printer} label="Imprimer" onClick={handlePrint} variant="secondary" />
            </div>
          </ReportCard>
        )}

        {/* R3 — Historique des mouvements */}
        <ReportCard icon={ArrowLeftRight} title="Historique mouvements" description="Toutes les entrées/sorties par période">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="date"
              value={movDateFrom}
              onChange={(e) => setMovDateFrom(e.target.value)}
              className="px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg"
              placeholder="Du"
            />
            <input
              type="date"
              value={movDateTo}
              onChange={(e) => setMovDateTo(e.target.value)}
              className="px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg"
              placeholder="Au"
            />
          </div>
          <div className="flex gap-2 mb-3">
            <select
              value={movType}
              onChange={(e) => setMovType(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg bg-white"
            >
              <option value="">Tous types</option>
              <option value="entree">Entrée</option>
              <option value="sortie">Sortie</option>
              <option value="transfert">Transfert</option>
              <option value="retour">Retour</option>
              <option value="ajustement">Ajustement</option>
            </select>
            <select
              value={movProject}
              onChange={(e) => setMovProject(e.target.value)}
              className="flex-1 px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg bg-white"
            >
              <option value="">Tous chantiers</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={FileSpreadsheet}
              label="Excel"
              loading={loading === 'r3'}
              onClick={() => {
                const params = new URLSearchParams();
                if (movDateFrom) params.set('date_from', movDateFrom);
                if (movDateTo) params.set('date_to', movDateTo);
                if (movType) params.set('movement_type', movType);
                if (movProject) params.set('project', movProject);
                handleDownload('r3', `${BASE_URL}stock-movements/export/?${params}`, `mouvements-${today}.xlsx`);
              }}
            />
            <ActionButton icon={Printer} label="Imprimer" onClick={handlePrint} variant="secondary" />
          </div>
        </ReportCard>

        {/* R4 — Stock critique */}
        <ReportCard icon={AlertTriangle} title="Stock critique" description="Articles en seuil bas ou en rupture (snapshot actuel)">
          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={FileText}
              label="CSV"
              loading={loading === 'r4'}
              onClick={() => handleDownload('r4', `${BASE_URL}items/critical-stock/export/`, `stock-critique-${today}.csv`)}
            />
            <ActionButton icon={Printer} label="Imprimer" onClick={handlePrint} variant="secondary" />
          </div>
        </ReportCard>

        {/* R5 — Budget vs Réalisé */}
        {hasPermission('reports.budget') && (
          <ReportCard icon={BarChart3} title="Budget vs Réalisé" description="Comparaison tous chantiers actifs">
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={FileSpreadsheet}
                label="Excel"
                loading={loading === 'r5'}
                onClick={() => handleDownload('r5', `${BASE_URL}reports/budget-vs-actual/?format=xlsx`, `budget-vs-realise-${today}.xlsx`)}
              />
              <ActionButton icon={Printer} label="Imprimer" onClick={handlePrint} variant="secondary" />
            </div>
          </ReportCard>
        )}

        {/* R6 — Consommation mensuelle */}
        {hasPermission('reports.financial') && (
          <ReportCard icon={CalendarDays} title="Consommation mensuelle" description="Coûts par catégorie, mois par mois">
            <div className="flex gap-2 mb-3">
              <select
                value={consumptionYear}
                onChange={(e) => setConsumptionYear(Number(e.target.value))}
                className="flex-1 px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg bg-white"
              >
                {[...Array(5)].map((_, i) => {
                  const yr = new Date().getFullYear() - i;
                  return <option key={yr} value={yr}>{yr}</option>;
                })}
              </select>
              <select
                value={consumptionProject}
                onChange={(e) => setConsumptionProject(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg bg-white"
              >
                <option value="">Tous chantiers</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={FileSpreadsheet}
                label="Excel"
                loading={loading === 'r6'}
                onClick={() => {
                  const params = new URLSearchParams({ format: 'xlsx' });
                  params.set('year', String(consumptionYear));
                  if (consumptionProject) params.set('project', consumptionProject);
                  handleDownload('r6', `${BASE_URL}reports/monthly-consumption/?${params}`, `consommation-${consumptionYear}.xlsx`);
                }}
              />
              <ActionButton
                icon={Mail}
                label="Email"
                variant="secondary"
                onClick={() => setEmailModal({ type: 'monthly_consumption', label: 'Consommation mensuelle', params: { year: consumptionYear, ...(consumptionProject ? { project: consumptionProject } : {}) } })}
              />
            </div>
          </ReportCard>
        )}

        {/* R7 — Transferts inter-sites */}
        {hasPermission('reports.site') && (
          <ReportCard icon={Truck} title="Transferts inter-sites" description="Mouvements entre dépôts / chantiers">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                type="date"
                value={transferDateFrom}
                onChange={(e) => setTransferDateFrom(e.target.value)}
                className="px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg"
              />
              <input
                type="date"
                value={transferDateTo}
                onChange={(e) => setTransferDateTo(e.target.value)}
                className="px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={FileSpreadsheet}
                label="Excel"
                loading={loading === 'r7'}
                onClick={() => {
                  const params = new URLSearchParams({ movement_type: 'transfert' });
                  if (transferDateFrom) params.set('date_from', transferDateFrom);
                  if (transferDateTo) params.set('date_to', transferDateTo);
                  handleDownload('r7', `${BASE_URL}stock-movements/export/?${params}`, `transferts-${today}.xlsx`);
                }}
              />
              <ActionButton icon={Printer} label="Imprimer" onClick={handlePrint} variant="secondary" />
            </div>
          </ReportCard>
        )}

        {/* R8 — Performance fournisseurs */}
        {hasPermission('reports.financial') && (
          <ReportCard icon={Factory} title="Performance fournisseurs" description="Agrégats livraisons, prix et volumes par fournisseur">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                type="date"
                value={supplierDateFrom}
                onChange={(e) => setSupplierDateFrom(e.target.value)}
                className="px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg"
              />
              <input
                type="date"
                value={supplierDateTo}
                onChange={(e) => setSupplierDateTo(e.target.value)}
                className="px-2 py-1.5 text-xs border border-outline-variant/30 rounded-lg"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                icon={FileSpreadsheet}
                label="Excel"
                loading={loading === 'r8'}
                onClick={() => {
                  const params = new URLSearchParams({ format: 'xlsx' });
                  if (supplierDateFrom) params.set('date_from', supplierDateFrom);
                  if (supplierDateTo) params.set('date_to', supplierDateTo);
                  handleDownload('r8', `${BASE_URL}reports/supplier-performance/?${params}`, `fournisseurs-${today}.xlsx`);
                }}
              />
              <ActionButton
                icon={Mail}
                label="Email"
                variant="secondary"
                onClick={() => setEmailModal({
                  type: 'supplier_performance',
                  label: 'Performance fournisseurs',
                  params: { ...(supplierDateFrom ? { date_from: supplierDateFrom } : {}), ...(supplierDateTo ? { date_to: supplierDateTo } : {}) },
                })}
              />
            </div>
          </ReportCard>
        )}
      </div>

      {emailModal && (
        <EmailModal
          reportType={emailModal.type}
          reportLabel={emailModal.label}
          params={emailModal.params}
          onClose={() => setEmailModal(null)}
        />
      )}
    </div>
  );
}

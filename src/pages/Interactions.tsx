import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  History,
  Users,
  Calendar,
  Package,
  Brain,
  FileText,
  Loader2,
  ChevronDown,
  AlertCircle,
  ArrowRight,
  SlidersHorizontal,
  Pencil,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Interaction, HCP, Page, NavigateFn, EditTarget } from '../lib/types';
import Badge from '../components/Badge';

interface InteractionsProps {
  onNavigate: NavigateFn;
}

export default function Interactions({ onNavigate }: InteractionsProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterInterest, setFilterInterest] = useState('');
  const [filterVia, setFilterVia] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadInteractions(); }, []);

  async function loadInteractions() {
    setLoading(true);
    const { data } = await supabase
      .from('interactions')
      .select('*, hcps(*)')
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setInteractions(data as Interaction[]);
    setLoading(false);
  }

  const filtered = interactions.filter(i => {
    const hcp = i.hcps as HCP | undefined;
    const matchSearch =
      !search ||
      hcp?.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.hospital ?? '').toLowerCase().includes(search.toLowerCase()) ||
      i.products_discussed?.some(p => p.toLowerCase().includes(search.toLowerCase())) ||
      (i.ai_summary ?? '').toLowerCase().includes(search.toLowerCase());
    const matchInterest = !filterInterest || i.interest_level === filterInterest;
    const matchVia = !filterVia || i.created_via === filterVia;
    return matchSearch && matchInterest && matchVia;
  });

  const sentimentIcon = (s: string) => {
    if (s === 'positive') return '↑';
    if (s === 'negative') return '↓';
    return '→';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interaction History</h1>
          <p className="text-slate-500 text-sm mt-1">{interactions.length} total interactions logged</p>
        </div>
        <button
          onClick={() => onNavigate('log-interaction')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Brain className="w-4 h-4" /> Log New
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by doctor, hospital, product or summary..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterInterest}
              onChange={e => setFilterInterest(e.target.value)}
              className="pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
            >
              <option value="">All Interest</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="neutral">Neutral</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterVia}
              onChange={e => setFilterVia(e.target.value)}
              className="pl-8 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
            >
              <option value="">All Sources</option>
              <option value="ai">AI Logged</option>
              <option value="form">Manual Form</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{search || filterInterest || filterVia ? 'No interactions match your filters.' : 'No interactions logged yet.'}</p>
          {!search && !filterInterest && !filterVia && (
            <button
              onClick={() => onNavigate('log-interaction')}
              className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 mx-auto"
            >
              Log first interaction <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(interaction => {
            const hcp = interaction.hcps as HCP | undefined;
            const isExpanded = expanded === interaction.id;

            return (
              <div
                key={interaction.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Main Row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : interaction.id)}
                  className="w-full px-6 py-4 flex items-start gap-4 text-left"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-emerald-500" />
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{hcp?.name ?? 'Unknown HCP'}</p>
                      <Badge value={interaction.interest_level} variant={interaction.interest_level} />
                      {interaction.created_via === 'ai' && <Badge value="AI" variant="ai" />}
                      {interaction.sentiment && (
                        <span className={`text-xs font-medium ${
                          interaction.sentiment === 'positive' ? 'text-emerald-600' :
                          interaction.sentiment === 'negative' ? 'text-red-500' : 'text-slate-500'
                        }`}>
                          {sentimentIcon(interaction.sentiment)} {interaction.sentiment}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {new Date(interaction.visit_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {(interaction.hospital ?? hcp?.hospital) && (
                        <span className="text-xs text-slate-400">
                          {interaction.hospital ?? hcp?.hospital}
                        </span>
                      )}
                      {interaction.products_discussed?.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <Package className="w-3 h-3" />
                          {interaction.products_discussed.slice(0, 2).join(', ')}
                          {interaction.products_discussed.length > 2 && ` +${interaction.products_discussed.length - 2}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {interaction.follow_up_date && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                        <Calendar className="w-3 h-3" />
                        Follow-up {new Date(interaction.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-slate-50 px-6 py-5 space-y-4 bg-slate-50/50">
                    {interaction.ai_summary && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-emerald-500" />
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">AI Summary</p>
                        </div>
                        <p className="text-sm text-emerald-900 leading-relaxed">{interaction.ai_summary}</p>
                        {interaction.next_action && (
                          <div className="mt-3 flex items-start gap-2 pt-3 border-t border-emerald-100">
                            <ArrowRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-700 font-medium">{interaction.next_action}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Samples Given</p>
                        <p className="text-sm font-semibold text-slate-900">{interaction.samples_given} packs</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Interest Level</p>
                        <Badge value={interaction.interest_level} variant={interaction.interest_level} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Logged Via</p>
                        <div className="flex items-center gap-1">
                          {interaction.created_via === 'ai'
                            ? <><Brain className="w-3.5 h-3.5 text-emerald-500" /><span className="text-sm text-emerald-700 font-medium">AI Chat</span></>
                            : <><FileText className="w-3.5 h-3.5 text-slate-500" /><span className="text-sm text-slate-700 font-medium">Manual Form</span></>
                          }
                        </div>
                      </div>
                      {interaction.follow_up_date && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-1">Follow-up</p>
                          <p className="text-sm font-semibold text-amber-700">
                            {new Date(interaction.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>

                    {interaction.products_discussed?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">Products Discussed</p>
                        <div className="flex flex-wrap gap-1.5">
                          {interaction.products_discussed.map(p => (
                            <span key={p} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {interaction.feedback && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Doctor's Feedback</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{interaction.feedback}</p>
                      </div>
                    )}

                    {interaction.notes && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{interaction.notes}</p>
                      </div>
                    )}

                    {interaction.raw_conversation && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Original Description</p>
                        <p className="text-sm text-slate-600 italic bg-white rounded-xl px-3 py-2 border border-slate-100">
                          "{interaction.raw_conversation}"
                        </p>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={() => onNavigate('log-interaction', { id: interaction.id, source: 'edit-interaction' } as EditTarget)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
                      >
                        <Pencil className="w-4 h-4" /> Edit with AI
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

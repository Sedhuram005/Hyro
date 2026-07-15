import { useEffect, useState } from 'react';
import {
  Users,
  CalendarCheck,
  Clock,
  AlertCircle,
  TrendingUp,
  Brain,
  ArrowRight,
  Activity,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HCP, Interaction, NavigateFn } from '../lib/types';
import Badge from '../components/Badge';
import LineChart from '../components/LineChart';

interface DashboardProps {
  onNavigate: NavigateFn;
}

interface Stats {
  totalHCPs: number;
  todayVisits: number;
  upcomingFollowUps: number;
  pendingInteractions: number;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({ totalHCPs: 0, todayVisits: 0, upcomingFollowUps: 0, pendingInteractions: 0 });
  const [recentInteractions, setRecentInteractions] = useState<Interaction[]>([]);
  const [trendData, setTrendData] = useState<{ label: string; value: number }[]>([]);
  const [topHCPs, setTopHCPs] = useState<(HCP & { interaction_count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const [hcpResult, todayResult, followUpResult, recentResult] = await Promise.all([
        supabase.from('hcps').select('id', { count: 'exact', head: true }),
        supabase.from('interactions').select('id', { count: 'exact', head: true }).eq('visit_date', today),
        supabase.from('interactions').select('id', { count: 'exact', head: true }).gte('follow_up_date', today).lte('follow_up_date', nextWeek),
        supabase.from('interactions').select('*, hcps(*)').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        totalHCPs: hcpResult.count ?? 0,
        todayVisits: todayResult.count ?? 0,
        upcomingFollowUps: followUpResult.count ?? 0,
        pendingInteractions: 0,
      });

      if (recentResult.data) setRecentInteractions(recentResult.data as Interaction[]);

      const { data: hcpData } = await supabase.from('hcps').select('*').limit(4);
      if (hcpData) {
        const hcpsWithCount = await Promise.all(
          hcpData.map(async (hcp) => {
            const { count } = await supabase
              .from('interactions')
              .select('id', { count: 'exact', head: true })
              .eq('hcp_id', hcp.id);
            return { ...hcp, interaction_count: count ?? 0 };
          })
        );
        setTopHCPs(hcpsWithCount);
      }

      // Fetch last 7 days interaction counts for trend chart
      const days: { label: string; value: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const { count } = await supabase
          .from('interactions')
          .select('id', { count: 'exact', head: true })
          .eq('visit_date', dateStr);
        days.push({
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          value: count ?? 0,
        });
      }
      setTrendData(days);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Total HCPs', value: stats.totalHCPs, icon: Users, bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-500', trend: '+2 this month' },
    { label: "Today's Visits", value: stats.todayVisits, icon: CalendarCheck, bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-600', trend: 'Logged today' },
    { label: 'Upcoming Follow-ups', value: stats.upcomingFollowUps, icon: Clock, bg: 'bg-teal-50', border: 'border-teal-100', iconBg: 'bg-teal-500', trend: 'Next 7 days' },
    { label: 'AI Interactions', value: recentInteractions.filter(i => i.created_via === 'ai').length, icon: Brain, bg: 'bg-emerald-50', border: 'border-emerald-100', iconBg: 'bg-emerald-600', trend: 'AI-logged' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Good morning, Medical Rep</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => onNavigate('log-interaction')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          Log Interaction
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-white rounded-2xl border ${card.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{card.trend}</p>
                </div>
                <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interaction Trend Chart */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-slate-900">Interaction Trends</h2>
          </div>
          <span className="text-xs text-slate-400">Last 7 days</span>
        </div>
        <div className="px-6 py-4">
          <LineChart data={trendData} height={220} color="#059669" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-600" />
              <h2 className="font-semibold text-slate-900">Recent Interactions</h2>
            </div>
            <button
              onClick={() => onNavigate('interactions')}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-emerald-50">
            {recentInteractions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No interactions yet</p>
                <button
                  onClick={() => onNavigate('log-interaction')}
                  className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Log your first interaction
                </button>
              </div>
            ) : (
              recentInteractions.map((interaction) => (
                <div key={interaction.id} className="px-6 py-4 hover:bg-emerald-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Users className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {(interaction.hcps as HCP)?.name ?? 'Unknown HCP'}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {(interaction.hcps as HCP)?.hospital ?? interaction.hospital ?? 'Unknown hospital'}
                        </p>
                        {interaction.products_discussed?.length > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">
                            {interaction.products_discussed.slice(0, 2).join(', ')}
                            {interaction.products_discussed.length > 2 && ` +${interaction.products_discussed.length - 2} more`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <Badge value={interaction.interest_level} variant={interaction.interest_level} />
                      <span className="text-xs text-slate-400">
                        {new Date(interaction.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {interaction.created_via === 'ai' && (
                        <Badge value="AI" variant="ai" />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Insights + Top HCPs */}
        <div className="space-y-5">
          {/* AI Insights */}
          <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-emerald-200" />
              <h3 className="font-semibold">AI Insights</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs font-medium text-emerald-100">Engagement Trend</p>
                <p className="text-sm mt-1 text-white">
                  {recentInteractions.filter(i => i.interest_level === 'high').length} high-interest HCPs in recent visits
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs font-medium text-emerald-100">AI Efficiency</p>
                <p className="text-sm mt-1 text-white">
                  {recentInteractions.filter(i => i.created_via === 'ai').length} of {recentInteractions.length} interactions logged via AI
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs font-medium text-emerald-100">Follow-ups Pending</p>
                <p className="text-sm mt-1 text-white">{stats.upcomingFollowUps} scheduled in next 7 days</p>
              </div>
            </div>
          </div>

          {/* Top HCPs */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Key HCPs</h3>
              </div>
              <button
                onClick={() => onNavigate('hcps')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                All <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-emerald-50">
              {topHCPs.map((hcp) => (
                <div key={hcp.id} className="px-5 py-3 flex items-center gap-3 hover:bg-emerald-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-emerald-600">
                      {hcp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{hcp.name}</p>
                    <p className="text-xs text-slate-400 truncate">{hcp.specialty}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 flex-shrink-0">
                    {hcp.interaction_count} visits
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

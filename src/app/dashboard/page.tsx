import {
  BarChart2,
  TrendingUp,
  FileText,
  Activity,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { getEngagementCounts, getRecentPosts, getRecentAudits, type NotionRecord } from '@/lib/notion';

const weeklyData = [
  { day: 'Mon', value: 42 },
  { day: 'Tue', value: 66 },
  { day: 'Wed', value: 38 },
  { day: 'Thu', value: 74 },
  { day: 'Fri', value: 59 },
  { day: 'Sat', value: 27 },
  { day: 'Sun', value: 21 },
];

const upcomingTasks = [
  { task: 'Run weekly content ideation session', pipeline: 'Pipeline 1', due: 'Monday', priority: 'high' },
  { task: 'Review drafted posts in Notion and publish best one', pipeline: 'Pipeline 2', due: 'Tuesday', priority: 'medium' },
  { task: 'Check engagement on last 3 LinkedIn posts', pipeline: 'Pipeline 3b', due: 'Wednesday', priority: 'medium' },
  { task: 'Update ICP file with new audience insights', pipeline: 'Pipeline 2', due: 'Friday', priority: 'low' },
];

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mapRecentPost(record: NotionRecord) {
  let title = record.title || 'Untitled post';
  if (title.length > 50) title = title.substring(0, 50) + '...';
  
  return {
    id: record.id,
    title,
    format: record.subtitle || 'Format',
    status: 'Draft',
    date: formatShortDate(record.createdAt),
    notionUrl: record.notionUrl || '#',
  };
}

async function withFallback<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

export default async function DashboardPage() {
  const recentPosts = await withFallback(() => getRecentPosts(5), [] as NotionRecord[]);
  const postsGenerated = await withFallback(async () => (await getRecentPosts(100)).length, 0);
  const auditsRun = await withFallback(async () => (await getRecentAudits(100)).length, 0);

  const tablePosts = recentPosts.map(mapRecentPost);
  const maxVal = Math.max(...weeklyData.map((d) => d.value));

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Analytics Dashboard</h1>
          <p className="text-slate-400 mt-1">Operational metrics from your Notion-linked pipeline data.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-400">
          <Calendar className="w-4 h-4" /> Apr 1 – Apr 27, 2026
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard label="Posts Generated" value={String(postsGenerated)} icon={<FileText className="w-5 h-5 text-blue-400" />} />
        <KpiCard label="Audits Run" value={String(auditsRun)} icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />} />
        <KpiCard
          label="Impressions"
          value="--"
          helperText="Requires LinkedIn API"
          icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
        />
        <KpiCard
          label="Engagement Rate"
          value="--"
          helperText="Requires LinkedIn API"
          icon={<BarChart2 className="w-5 h-5 text-violet-400" />}
        />
      </div>

      {/* Chart + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bar chart */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Weekly Performance (Illustrative)</h2>
            <span className="text-xs text-slate-400 bg-slate-800 rounded-md px-2 py-1">Preview Only</span>
          </div>
          <div className="flex items-end gap-3 h-48">
            {weeklyData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-medium">--</span>
                <div className="w-full relative" style={{ height: '160px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500"
                    style={{ height: `${(d.value / maxVal) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{d.day}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">Connect LinkedIn Analytics to populate with real impressions data</p>
        </div>

        {/* Upcoming tasks */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Upcoming Tasks
          </h2>
          <div className="space-y-3">
            {upcomingTasks.map((t, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 transition-colors">
                <p className="text-sm font-medium text-white mb-1 leading-snug">{t.task}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{t.pipeline}</span>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    t.priority === 'high' ? 'text-rose-400' :
                    t.priority === 'medium' ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    <Clock className="w-3 h-3" /> {t.due}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent posts table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <h2 className="text-lg font-bold text-white">Recent Posts</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {tablePosts.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">No posts yet — run the Generation pipeline to create your first draft.</div>
          ) : (
            tablePosts.map((p) => (
              <a key={p.id} href={p.notionUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/40 transition-colors group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="shrink-0 w-2 h-2 rounded-full bg-amber-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate max-w-xs">{p.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.date} · {p.format} · {p.status}</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, helperText }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  helperText?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
      </div>
      <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
      <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
      {helperText && <p className="text-xs text-slate-500 mt-2">{helperText}</p>}
    </div>
  );
}

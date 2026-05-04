import {
  FileText,
  Activity,
  Calendar,
  Clock,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { getEngagementCounts, getRecentPosts, type NotionRecord } from '@/lib/notion';

const upcomingTasks = [
  { task: 'Run weekly content ideation session', pipeline: 'Pipeline 1', due: 'Monday', priority: 'high' },
  { task: 'Review and publish drafted posts in Notion', pipeline: 'Pipeline 2', due: 'Tuesday', priority: 'medium' },
  { task: 'Check engagement on last 3 posts', pipeline: 'Pipeline 3b', due: 'Wednesday', priority: 'medium' },
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
  const isPublished = /published/i.test(record.subtitle);
  
  return {
    id: record.id,
    title,
    format: record.subtitle || 'Format',
    status: isPublished ? 'Published' : 'Draft',
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
  const engagementCounts = await withFallback(() => getEngagementCounts(), { plans: 0, notes: 0, comments: 0 });

  const tablePosts = recentPosts.map(mapRecentPost);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <KpiCard label="Calendar Posts" value={String(postsGenerated)} icon={<FileText className="w-5 h-5 text-blue-400" />} />
        <KpiCard label="Engagement Plans" value={String(engagementCounts.plans)} icon={<Activity className="w-5 h-5 text-emerald-400" />} />
      </div>

      {/* Upcoming tasks */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Upcoming Tasks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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

      {/* Recent posts table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <h2 className="text-lg font-bold text-white">Recent Posts</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {tablePosts.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">No calendar posts yet — run Pipeline 3 (Content Calendar) to generate your first month.</div>
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

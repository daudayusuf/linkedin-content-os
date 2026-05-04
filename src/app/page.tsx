import {
  Activity,
  ArrowRight,
  Bot,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { getRecentActivity, getRecentPosts } from "@/lib/notion";
import { HomeButtons } from "./HomeButtons";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Yesterday' : `${d}d ago`;
}

export default async function Home() {
  let activity: any[] = [];
  let postsCount = 0;

  try {
    activity = await getRecentActivity(50);
  } catch {}

  try {
    const posts = await getRecentPosts(100);
    postsCount = posts.length;
  } catch {}

  const today = new Date().toISOString().slice(0, 10);
  const todayRuns = activity.filter((a: any) => (a.createdAt || '').startsWith(today)).length;

  const pipelineLastRun: Record<string, string> = {};
  for (const entry of activity) {
    const p = (entry as any).pipeline as string;
    if (p && !pipelineLastRun[p]) {
      pipelineLastRun[p] = entry.createdAt;
    }
  }

  function lastRun(pipeline: string): string {
    return pipelineLastRun[pipeline] ? timeAgo(pipelineLastRun[pipeline]) : 'Never';
  }

  const subtitle = todayRuns > 0
    ? `${todayRuns} pipeline run${todayRuns === 1 ? '' : 's'} today. Your content OS is active.`
    : 'No runs today yet. Pick a pipeline to start.';

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white mb-2">
            Welcome back, Daud.
          </h1>
          <p className="text-slate-400 text-base md:text-lg">
            {subtitle}
          </p>
        </div>
        <HomeButtons />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Calendar Posts"
          value={String(postsCount)}
          trend="All time total"
          isPositive={true}
          icon={<FileText className="text-blue-400 w-5 h-5" />}
        />
        <MetricCard
          title="Active Agents"
          value="4"
          trend="All systems nominal"
          isPositive={true}
          icon={<Bot className="text-cyan-400 w-5 h-5" />}
        />
      </div>

      {/* Main content split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Active Pipelines */}
        <div className="col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Active Pipelines
          </h2>
          <div className="space-y-4">
            <PipelineCard
              name="Pipeline 1: Market, Audience & Competitor Research"
              status="Ready"
              lastRun={lastRun('Research')}
              href="/pipelines/research"
              description="Deep-dive your market landscape, ICP, and top competitors to produce grounded research that feeds every downstream pipeline."
              color="from-amber-500/20 to-yellow-500/20"
              border="border-amber-500/30"
            />
            <PipelineCard
              name="Pipeline 2: Content Strategy Planning and Building"
              status="Ready"
              lastRun={lastRun('Strategy')}
              href="/pipelines/strategy"
              description="Builds a 7–90 day actionable content strategy grounded in your market research, ICP, and competitor analysis."
              color="from-green-500/20 to-emerald-500/20"
              border="border-green-500/30"
            />
            <PipelineCard
              name="Pipeline 3: Content Calendar, Planning & Writing"
              status="Ready"
              lastRun={lastRun('Calendar')}
              href="/pipelines/calendar"
              description="Converts your content strategy into a complete, publication-ready 30-day LinkedIn calendar — every post fully written."
              color="from-blue-500/20 to-cyan-500/20"
              border="border-blue-500/30"
            />
            <PipelineCard
              name="Pipeline 3b: Engagement Session Plans & Writing"
              status="Ready"
              lastRun={lastRun('Engagement')}
              href="/pipelines/engagement"
              description="Scrape target accounts and draft personalized connection request notes and comment templates."
              color="from-emerald-500/20 to-teal-500/20"
              border="border-emerald-500/30"
            />
            <PipelineCard
              name="Pipeline 4: Visuals & Graphics"
              status="In Development"
              lastRun={lastRun('Visuals')}
              href="/pipelines/visuals"
              description="Generate carousel slides, post banners, and quote cards for your LinkedIn content via Canva API integration."
              color="from-violet-500/20 to-purple-500/20"
              border="border-violet-500/30"
            />
            <PipelineCard
              name="Pipeline 5: LinkedIn Post & Profile Audit"
              status="Ready"
              lastRun={lastRun('Audit')}
              href="/pipelines/audit"
              description="Analyze a LinkedIn profile, score recent content, and generate a 30-day strategy report."
              color="from-purple-500/20 to-blue-500/20"
              border="border-purple-500/30"
            />
            <PipelineCard
              name="Pipeline 5b: Performance Analysis Snapshot & Metrics"
              status="Ready"
              lastRun={lastRun('Performance')}
              href="/pipelines/performance"
              description="Aggregate your LinkedIn post metrics, generate weekly and monthly snapshots, and identify your best-performing content patterns."
              color="from-cyan-500/20 to-sky-500/20"
              border="border-cyan-500/30"
            />
          </div>
        </div>

        {/* System Logs / Activity */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" /> Recent Activity
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <div className="space-y-5">
              {activity.length === 0 ? (
                <p className="text-slate-500 text-sm">No activity yet. Run a pipeline to see logs here.</p>
              ) : activity.slice(0, 5).map((item: any) => (
                <ActivityItem
                  key={item.id}
                  time={timeAgo(item.createdAt)}
                  title={item.title}
                  desc={item.subtitle}
                  type={item.type ?? 'info'}
                />
              ))}
            </div>

            <button className="w-full mt-6 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors">
              View All Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function MetricCard({ title, value, trend, isPositive, icon }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl transition-all hover:border-slate-700 hover:shadow-2xl hover:bg-slate-800/50 group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
          {icon}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        }`}>
          {trend}
        </span>
      </div>
      <div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function PipelineCard({ name, status, lastRun, href, description, color, border }: any) {
  return (
    <Link href={href} className="block group">
      <div className={`bg-gradient-to-r ${color} border ${border} rounded-2xl p-4 md:p-6 transition-all hover:shadow-2xl hover:-translate-y-1`}>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-base md:text-lg font-bold text-white group-hover:text-blue-200 transition-colors">{name}</h3>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                status === 'Running' ? 'bg-blue-500/20 text-blue-300 animate-pulse' :
                status === 'Ready' ? 'bg-emerald-500/20 text-emerald-300' :
                status === 'In Development' ? 'bg-violet-500/20 text-violet-300' :
                'bg-slate-500/20 text-slate-300'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-slate-300 text-sm max-w-xl">{description}</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-xs text-slate-400 font-medium mb-4 block">Last run: {lastRun}</span>
            <div className="bg-white/10 group-hover:bg-white/20 p-2 rounded-full transition-colors backdrop-blur-sm">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ActivityItem({ time, title, desc, type }: any) {
  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center mt-1">
        <div className={`w-2.5 h-2.5 rounded-full z-10 ${
          type === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' :
          type === 'info' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' :
          'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
        }`} />
        <div className="w-px h-full bg-slate-800 mt-2 absolute top-2 bottom-[-20px]" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium mb-0.5">{time}</p>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

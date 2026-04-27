import { 
  Activity, 
  ArrowRight, 
  Bot, 
  FileText, 
  TrendingUp, 
  Users 
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Header section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Welcome back, Admin.
          </h1>
          <p className="text-slate-400 text-lg">
            Your LinkedIn Content OS is running smoothly. 3 pipelines are active.
          </p>
        </div>
        <div className="flex gap-4">
          <button className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-black/20 flex items-center gap-2">
            <RefreshCcwIcon className="w-4 h-4 text-slate-400" />
            Refresh Data
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2">
            New Campaign <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Impressions" 
          value="124.5K" 
          trend="+12.5%" 
          isPositive={true}
          icon={<TrendingUp className="text-emerald-400 w-5 h-5" />}
        />
        <MetricCard 
          title="Posts Generated" 
          value="48" 
          trend="+4" 
          isPositive={true}
          icon={<FileText className="text-blue-400 w-5 h-5" />}
        />
        <MetricCard 
          title="Engagement Rate" 
          value="4.2%" 
          trend="-0.5%" 
          isPositive={false}
          icon={<Activity className="text-purple-400 w-5 h-5" />}
        />
        <MetricCard 
          title="Active Agents" 
          value="5" 
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
              name="Pipeline 5: LinkedIn Post & Profile Audit" 
              status="Ready" 
              lastRun="2 hours ago"
              href="/pipelines/audit"
              description="Analyze a LinkedIn profile, score recent content, and generate a 30-day strategy report."
              color="from-purple-500/20 to-blue-500/20"
              border="border-purple-500/30"
            />
            <PipelineCard 
              name="Pipeline 3: Engagement Session Plans" 
              status="Running" 
              lastRun="Now"
              href="/pipelines/engagement"
              description="Scraping target accounts and drafting personalized connection requests & comments."
              color="from-emerald-500/20 to-teal-500/20"
              border="border-emerald-500/30"
            />
             <PipelineCard 
              name="Pipeline 1: Content Ideation" 
              status="Idle" 
              lastRun="1 day ago"
              href="/pipelines/ideation"
              description="Scraping industry news and Perplexity for highly-engaging post concepts."
              color="from-slate-800 to-slate-800"
              border="border-slate-700"
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
              <ActivityItem 
                time="10:42 AM" 
                title="Audit Agent completed run" 
                desc="Generated PDF report for Dr. Staci Moore"
                type="success"
              />
              <ActivityItem 
                time="09:15 AM" 
                title="Perplexity Integration" 
                desc="Fetched 15 new trend topics for niche: Digital Marketing"
                type="info"
              />
              <ActivityItem 
                time="08:00 AM" 
                title="Cron Task Executed" 
                desc="Trigger.dev started Pipeline 3"
                type="info"
              />
              <ActivityItem 
                time="Yesterday" 
                title="Review Agent flagged post" 
                desc="Removed word 'delve' from drafted post"
                type="warning"
              />
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

function RefreshCcwIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21v-5h5" />
    </svg>
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
      <div className={`bg-gradient-to-r ${color} border ${border} rounded-2xl p-6 transition-all hover:shadow-2xl hover:-translate-y-1`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">{name}</h3>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                status === 'Running' ? 'bg-blue-500/20 text-blue-300 animate-pulse' : 
                status === 'Ready' ? 'bg-emerald-500/20 text-emerald-300' : 
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

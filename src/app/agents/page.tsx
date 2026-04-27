import { Bot, Settings2, Activity, Zap, ShieldAlert, Cpu } from 'lucide-react';

export default function AgentsDashboard() {
  return (
    <div className="p-8 max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Bot className="w-8 h-8 text-blue-400" />
            </div>
            AI Agents Fleet
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Monitor and configure your specialized autonomous agents.
          </p>
        </div>
        <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Global Settings
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AgentCard 
          name="Review Agent"
          role="Quality & Compliance"
          model="Gemini 1.5 Pro"
          status="Active"
          tasksCompleted={142}
          description="Enforces brand voice guidelines and removes blacklisted phrases (e.g., 'delve', 'in today's fast-paced')."
          icon={<ShieldAlert className="w-6 h-6 text-amber-400" />}
          color="from-amber-500/20 to-orange-500/10"
          border="border-amber-500/30"
        />
        <AgentCard 
          name="Audit Agent"
          role="Analysis & Strategy"
          model="Claude 3.5 Sonnet"
          status="Idle"
          tasksCompleted={45}
          description="Scores profiles on 6 dimensions and formulates 30-day content strategies based on historical data."
          icon={<Activity className="w-6 h-6 text-purple-400" />}
          color="from-purple-500/20 to-pink-500/10"
          border="border-purple-500/30"
        />
        <AgentCard 
          name="Ideation Agent"
          role="Research & Trends"
          model="Perplexity API"
          status="Active"
          tasksCompleted={89}
          description="Scours the web for real-time trending topics in digital marketing and creates post hooks."
          icon={<Zap className="w-6 h-6 text-cyan-400" />}
          color="from-cyan-500/20 to-blue-500/10"
          border="border-cyan-500/30"
        />
         <AgentCard 
          name="Engagement Agent"
          role="Outreach & Commenting"
          model="GPT-4o"
          status="Running"
          tasksCompleted={1204}
          description="Drafts personalized connection requests and high-value comments for target accounts."
          icon={<Cpu className="w-6 h-6 text-emerald-400" />}
          color="from-emerald-500/20 to-teal-500/10"
          border="border-emerald-500/30"
        />
      </div>
    </div>
  );
}

function AgentCard({ name, role, model, status, tasksCompleted, description, icon, color, border }: any) {
  return (
    <div className={`bg-gradient-to-br ${color} border ${border} rounded-2xl p-6 transition-all hover:shadow-2xl hover:bg-slate-800/80 group flex flex-col h-full`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-900 rounded-xl shadow-inner border border-slate-800">
          {icon}
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
          status === 'Running' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' : 
          status === 'Active' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
          'bg-slate-500/10 text-slate-400 border-slate-500/20'
        }`}>
          {status}
        </span>
      </div>
      
      <div className="flex-1">
        <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
        <p className="text-sm text-slate-400 font-medium mb-3">{role}</p>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">{description}</p>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-800/50 flex justify-between items-center text-sm">
        <div className="text-slate-400">
          <span className="font-semibold text-white">{tasksCompleted}</span> tasks
        </div>
        <div className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-400 border border-slate-800">
          {model}
        </div>
      </div>
    </div>
  );
}

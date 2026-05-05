'use client';

import { Key, Database, Workflow, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

const ENV_VARS: { section: string; icon: React.ReactNode; color: string; vars: { name: string; description: string; example: string }[] }[] = [
  {
    section: 'Trigger.dev',
    icon: <Workflow className="w-5 h-5 text-blue-400" />,
    color: 'blue',
    vars: [
      { name: 'TRIGGER_SECRET_KEY', description: 'Background job runner secret', example: 'tr_prod_...' },
    ],
  },
  {
    section: 'AI Providers',
    icon: <Shield className="w-5 h-5 text-purple-400" />,
    color: 'purple',
    vars: [
      { name: 'ANTHROPIC_API_KEY', description: 'Claude (Sonnet) for all pipelines', example: 'sk-ant-...' },
      { name: 'OPENROUTER_API_KEY', description: 'OpenRouter fallback / GPT-4o', example: 'sk-or-...' },
      { name: 'GROQ_API_KEY', description: 'Groq fast inference', example: 'gsk_...' },
    ],
  },
  {
    section: 'Scraping & Data',
    icon: <Key className="w-5 h-5 text-amber-400" />,
    color: 'amber',
    vars: [
      { name: 'RAPIDAPI_KEY', description: 'LinkedIn post scraper (fresh-linkedin-profile-data)', example: 'xxxxxx...' },
      { name: 'SCRAPINGDOG_API_KEY', description: 'LinkedIn profile + page scraper', example: '69e1...' },
    ],
  },
  {
    section: 'Notion',
    icon: <Database className="w-5 h-5 text-emerald-400" />,
    color: 'emerald',
    vars: [
      { name: 'NOTION_API_KEY', description: 'Notion integration token', example: 'ntn_...' },
      { name: 'NOTION_PARENT_PAGE_ID', description: 'Root page where databases are auto-created', example: '34c401...' },
    ],
  },
  {
    section: 'Email Delivery',
    icon: <CheckCircle2 className="w-5 h-5 text-rose-400" />,
    color: 'rose',
    vars: [
      { name: 'GMAIL_FROM_ADDRESS', description: 'Gmail address for audit email delivery', example: 'you@gmail.com' },
      { name: 'GMAIL_APP_PASSWORD', description: 'Gmail App Password (NOT account password — generate at myaccount.google.com/apppasswords)', example: 'xxxx xxxx xxxx xxxx' },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg">
            <Key className="w-8 h-8 text-slate-400" />
          </div>
          System Settings & API Keys
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Environment variables required to run the content OS.
        </p>
      </div>

      <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex gap-4">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300 mb-1">Keys are server-side only</p>
          <p className="text-sm text-slate-400">
            All API keys are configured in <code className="text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded text-xs">frontend/.env</code> and read by the server at runtime via <code className="text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded text-xs">process.env</code>. They are never exposed to the browser. To update a key, edit the <code className="text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded text-xs">.env</code> file and restart the server.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {ENV_VARS.map((section) => (
          <div key={section.section} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              {section.icon} {section.section}
            </h2>
            <div className="space-y-3">
              {section.vars.map((v) => (
                <div key={v.name} className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 items-start">
                  <code className="text-xs font-mono bg-slate-800 text-slate-200 px-2 py-1 rounded mt-0.5 whitespace-nowrap">
                    {v.name}
                  </code>
                  <div>
                    <p className="text-sm text-slate-300">{v.description}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">e.g. {v.example}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

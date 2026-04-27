'use client';

import { Key, Save, Database, Workflow, Shield } from 'lucide-react';

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
          Manage your external integrations and environment variables.
        </p>
      </div>

      <div className="space-y-8">
        
        {/* Trigger.dev Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <Workflow className="w-5 h-5 text-blue-400" /> Trigger.dev (Backend Workflows)
          </h2>
          <p className="text-sm text-slate-400 mb-6">Required for securely running background Python scripts on Vercel.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Secret Key (TRIGGER_SECRET_KEY)</label>
              <input type="password" placeholder="tr_test_xxxxxxxx" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>
        </div>

        {/* AI Providers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" /> AI Providers
          </h2>
          <p className="text-sm text-slate-400 mb-6">Keys for local LLM inference and scraping.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">OpenAI API Key (GPT-4o)</label>
              <input type="password" placeholder="sk-..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Google Gemini API Key</label>
              <input type="password" placeholder="AIzaSy..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500 transition-all" />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">RapidAPI Key (LinkedIn Scraper)</label>
              <input type="password" placeholder="xxxxxxxxxxxxxxxxx" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500 transition-all" />
            </div>
          </div>
        </div>

        {/* Databases */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" /> Notion Database Integrations
          </h2>
          <p className="text-sm text-slate-400 mb-6">Sync your generated content directly to Notion.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Notion Integration Token</label>
              <input type="password" placeholder="secret_..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Drafts Database ID</label>
                <input type="text" placeholder="..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">CRM Database ID</label>
                <input type="text" placeholder="..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 transition-all" />
              </div>
            </div>
          </div>
        </div>

        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all">
          <Save className="w-5 h-5" /> Save Configuration
        </button>

      </div>
    </div>
  );
}

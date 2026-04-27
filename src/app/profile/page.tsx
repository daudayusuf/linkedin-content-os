'use client';

import { User, Image as ImageIcon, BookOpen, Save } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="p-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <User className="w-8 h-8 text-blue-400" />
            </div>
            Personal Brand Profile
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Configure the tone, voice, and personal stories used by your AI Agents.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* Core Identity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-1">Core Identity</h2>
          <p className="text-sm text-slate-400 mb-6">Basic information for signature blocks and connection requests.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
              <input type="text" defaultValue="Admin User" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Current Title / Tagline</label>
              <input type="text" defaultValue="Founder @ Content OS" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>
        </div>

        {/* Brand Voice */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" /> Brand Voice & Tone
          </h2>
          <p className="text-sm text-slate-400 mb-6">Instructions given to the Content Generation agents.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Tone Guidelines</label>
              <textarea 
                defaultValue="Professional but approachable. Use short sentences. Avoid corporate jargon. Never use the word 'delve'."
                className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all resize-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Blacklisted Words (Comma separated)</label>
              <input type="text" defaultValue="delve, testiment, fast-paced, landscape, navigating, crucial" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>
        </div>

        {/* Visual Brand Assets */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-rose-400" /> Visual Brand Assets
          </h2>
          <p className="text-sm text-slate-400 mb-6">Used by the visual agents for PDF Audits and carousel generation.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Primary Brand Color (Hex)</label>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-600 border-2 border-slate-700"></div>
                <input type="text" defaultValue="#2563EB" className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Secondary Color (Hex)</label>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-100 border-2 border-slate-700"></div>
                <input type="text" defaultValue="#F1F5F9" className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>
          </div>
        </div>

        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all">
          <Save className="w-5 h-5" /> Save Profile
        </button>

      </div>
    </div>
  );
}

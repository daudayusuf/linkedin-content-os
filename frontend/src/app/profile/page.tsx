'use client';

import { useState, useEffect } from 'react';
import { User, Image as ImageIcon, BookOpen, Save, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'content_os_profile';

export default function ProfilePage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    fullName: 'Admin User',
    tagline: 'Founder @ Content OS',
    toneGuidelines: "Professional but approachable. Use short sentences. Avoid corporate jargon. Never use the word 'delve'.",
    blacklist: 'delve, testiment, fast-paced, landscape, navigating, crucial',
    primaryColor: '#2563EB',
    secondaryColor: '#F1F5F9',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setForm(JSON.parse(stored));
    } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

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
              <input type="text" value={form.fullName} onChange={set('fullName')} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Current Title / Tagline</label>
              <input type="text" value={form.tagline} onChange={set('tagline')} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all" />
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
                value={form.toneGuidelines}
                onChange={set('toneGuidelines')}
                className="w-full h-24 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Blacklisted Words (Comma separated)</label>
              <input type="text" value={form.blacklist} onChange={set('blacklist')} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all" />
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
                <div className="w-12 h-12 rounded-lg border-2 border-slate-700" style={{ backgroundColor: form.primaryColor }} />
                <input type="text" value={form.primaryColor} onChange={set('primaryColor')} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Secondary Color (Hex)</label>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg border-2 border-slate-700" style={{ backgroundColor: form.secondaryColor }} />
                <input type="text" value={form.secondaryColor} onChange={set('secondaryColor')} className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all ${
            saved ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
          } text-white`}
        >
          {saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {saved ? 'Saved!' : 'Save Profile'}
        </button>

      </div>
    </div>
  );
}

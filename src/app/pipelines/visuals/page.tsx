import { ImageIcon } from 'lucide-react';

export default function VisualsPipeline() {
  return (
    <div className="p-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
            In Development
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <ImageIcon className="w-8 h-8 text-violet-400" />
          </div>
          Pipeline 4: Visuals & Graphics
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Generate carousel graphics, post banners, and branded visual assets for LinkedIn using the Canva API.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">Status</h2>
          <p className="text-slate-300 leading-relaxed">
            Canva API integration is in development. Credentials are being configured. This pipeline will auto-generate branded visuals once setup is complete.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">Planned Outputs</h2>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              Carousel slide decks (7-slide format)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              Post banner graphics (1200x627px)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              Profile banner updates
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              Quote card graphics
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

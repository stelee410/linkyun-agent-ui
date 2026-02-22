
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemePreset } from '../../types';

const ThemeCustomizer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { theme, setTheme, resetTheme, applyPreset } = useTheme();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const presetList: { id: ThemePreset; name: string; color: string; icon: string }[] = [
    { id: 'lumina', name: 'Lumina Dark', color: '#13b6ec', icon: 'blur_on' },
    { id: 'lumina-light', name: 'Lumina Light', color: '#13b6ec', icon: 'light_mode' },
    { id: 'facebook', name: 'Facebook', color: '#0866FF', icon: 'facebook' },
    { id: 'wechat', name: 'WeChat', color: '#07C160', icon: 'chat' },
    { id: 'retro80s', name: '1980s Retro', color: '#FF00FF', icon: 'magic_button' },
    { id: 'gameboy', name: 'Gameboy', color: '#306230', icon: 'videogame_asset' },
  ];

  const fontOptions = [
    { name: 'Jakarta Sans', value: "'Plus Jakarta Sans'" },
    { name: 'System Sans', value: 'system-ui' },
    { name: 'Orbitron', value: "'Orbitron'" },
    { name: 'Pixel Font', value: "'Press Start 2P'" },
    { name: 'Serif', value: 'serif' },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-surface-dark border border-border-dark w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-border-dark flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">palette</span>
            Theme Customizer
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Presets Grid */}
          <section>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Style Presets</label>
            <div className="grid grid-cols-2 gap-3">
              {presetList.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                    theme.preset === p.id 
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20' 
                    : 'border-border-dark text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm" style={{ color: p.color }}>{p.icon}</span>
                  <span className="text-xs font-bold">{p.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Advanced Typography */}
          <section className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Font Family</label>
              <select 
                value={theme.fontFamily}
                onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value, preset: 'lumina' })}
                className="w-full bg-background-dark border border-border-dark rounded-xl text-xs font-bold text-white px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
              >
                {fontOptions.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Base Size</label>
              <select 
                value={theme.baseFontSize}
                onChange={(e) => setTheme({ ...theme, baseFontSize: e.target.value, preset: 'lumina' })}
                className="w-full bg-background-dark border border-border-dark rounded-xl text-xs font-bold text-white px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
              >
                {['10px', '12px', '14px', '15px', '16px', '18px'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </section>

          {/* Primary Color */}
          <section>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Manual Accent</label>
            <div className="flex items-center gap-3">
                <input 
                    type="color" 
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value, preset: 'lumina' })}
                    className="size-12 rounded-xl bg-transparent border-none cursor-pointer p-0"
                />
                <div className="flex-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Color Hex</p>
                    <p className="text-sm font-mono text-white">{theme.primaryColor.toUpperCase()}</p>
                </div>
            </div>
          </section>

          {/* Border Radius */}
          <section>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Edge Style</label>
            <div className="flex gap-2">
              {(['none', 'small', 'medium', 'large'] as const).map(radius => (
                <button
                  key={radius}
                  onClick={() => setTheme({ ...theme, borderRadius: radius })}
                  className={`flex-1 py-2 rounded-xl border-2 transition-all text-[10px] font-bold uppercase tracking-wider ${theme.borderRadius === radius ? 'border-primary bg-primary/10 text-primary' : 'border-border-dark text-slate-500 hover:text-slate-300'}`}
                >
                  {radius}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-6 bg-black/20 flex justify-between gap-3">
          <button 
            onClick={resetTheme}
            className="text-xs text-slate-500 hover:text-white transition-colors underline decoration-dotted"
          >
            {t.common.reset}
          </button>
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-all shadow-lg"
          >
            {t.common.done}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizer;

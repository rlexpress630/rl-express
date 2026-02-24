
import React from 'react';
import { useApp } from '../App';

const SettingsMenu: React.FC = () => {
  const { settings, setSettings } = useApp();

  const accentColors = [
    { name: 'rose', hex: '#dc2626', label: 'Vermelho' },
    { name: 'indigo', hex: '#4f46e5', label: 'Índigo' },
    { name: 'blue', hex: '#2563eb', label: 'Azul' },
    { name: 'emerald', hex: '#10b981', label: 'Verde' },
    { name: 'amber', hex: '#d97706', label: 'Âmbar' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden animate-fade-in transition-all">
      <div className="p-4 border-b border-gray-50 dark:border-gray-700/30 flex items-center space-x-3 bg-gray-50/50 dark:bg-gray-900/20">
         <div className="p-1.5 bg-red-600 rounded-lg shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
         </div>
         <h3 className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-widest italic">Ajustes do App</h3>
      </div>
      
      <div className="p-4 space-y-5">
        {/* Seção Tema */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-500 mb-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Tema Visual</span>
          </div>
          <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl">
            <button
              onClick={() => setSettings(s => ({ ...s, theme: 'light' }))}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${settings.theme === 'light' ? 'bg-white text-red-600 shadow-sm border border-gray-100' : 'text-gray-400'}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <span>Claro</span>
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, theme: 'dark' }))}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${settings.theme === 'dark' ? 'bg-gray-800 text-red-400 shadow-sm border border-gray-700' : 'text-gray-400'}`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              <span>Escuro</span>
            </button>
          </div>
        </div>

        {/* Seção Cor de Destaque */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-500 mb-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Cor de Destaque</span>
          </div>
          <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-2 rounded-xl">
            {accentColors.map(color => (
              <button
                key={color.name}
                onClick={() => setSettings(s => ({ ...s, accentColor: color.name as any }))}
                className={`w-7 h-7 rounded-full transition-all relative flex items-center justify-center ring-offset-2 dark:ring-offset-gray-900 ${settings.accentColor === color.name ? 'ring-2 ring-gray-400 scale-110 shadow-lg' : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                style={{ backgroundColor: color.hex }}
                title={color.label}
              >
                {settings.accentColor === color.name && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </button>
            ))}
          </div>
        </div>

        {/* Seção Escala de Fonte */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-gray-400 dark:text-gray-500 mb-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Escala da Interface</span>
          </div>
          <div className="flex bg-gray-50 dark:bg-gray-900 p-1 rounded-xl">
            {(['small', 'medium', 'large'] as const).map(size => (
              <button
                key={size}
                onClick={() => setSettings(s => ({ ...s, fontSize: size }))}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${settings.fontSize === size ? 'bg-white dark:bg-gray-800 text-red-600 shadow-sm border border-gray-100 dark:border-gray-700' : 'text-gray-400'}`}
              >
                {size === 'small' ? 'Compacto' : size === 'medium' ? 'Padrão' : 'Focado'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMenu;

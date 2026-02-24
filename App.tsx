
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminPanel from './views/AdminPanel';
import MotoboyPanel from './views/MotoboyPanel';
import Login from './views/Login';
import { AppSettings, User } from './types';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp deve ser usado dentro de AppProvider');
  return context;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('app-settings');
      return saved ? JSON.parse(saved) : {
        theme: 'light',
        fontSize: 'medium',
        accentColor: 'rose' // Rose é o tom de vermelho mais próximo nas opções
      };
    } catch (e) {
      return { theme: 'light', fontSize: 'medium', accentColor: 'rose' };
    }
  });

  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
  }, [settings]);

  // Aplicação das configurações globais
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Transição suave global
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease';

    if (settings.theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#111827';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#f9fafb';
    }

    const fontSizeMap = { small: '13px', medium: '15px', large: '18px' };
    root.style.fontSize = fontSizeMap[settings.fontSize];

    const colorMap = {
      indigo: { primary: '#4f46e5', secondary: '#4338ca', light: '#eef2ff' },
      blue: { primary: '#2563eb', secondary: '#1d4ed8', light: '#eff6ff' },
      rose: { primary: '#dc2626', secondary: '#b91c1c', light: '#fef2f2' }, // Ajustado para Red-600
      emerald: { primary: '#10b981', secondary: '#047857', light: '#ecfdf5' },
      amber: { primary: '#d97706', secondary: '#b45309', light: '#fffbeb' },
    };

    const colors = colorMap[settings.accentColor] || colorMap.rose;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-dark', colors.secondary);
    root.style.setProperty('--color-primary-light', colors.light);
  }, [settings]);

  return (
    <AppContext.Provider value={{ user, setUser, settings, setSettings }}>
      <HashRouter>
        <div className={`min-h-screen transition-colors duration-300 ${settings.theme === 'dark' ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/admin/*" 
              element={user?.role === 'ADMIN' ? <AdminPanel /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/motoboy/*" 
              element={user?.role === 'MOTOBOY' ? <MotoboyPanel /> : <Navigate to="/login" />} 
            />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;

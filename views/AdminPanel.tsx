
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractAddressesFromImages, optimizeRoute } from '../services/geminiService';
import { Delivery, DeliveryStatus } from '../types';
import SettingsMenu from '../components/SettingsMenu';
import { useApp } from '../App';
import { Map as MapIcon, List, Navigation, Trash2, Plus, Camera, Settings, LogOut, Menu, X, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MapView: React.FC<{ deliveries: Delivery[] }> = ({ deliveries }) => {
  // Simular coordenadas se não existirem
  const points = useMemo(() => {
    return deliveries.map((d, i) => ({
      ...d,
      x: d.lng ? (d.lng + 180) * 2 : Math.random() * 80 + 10, // Mock x
      y: d.lat ? (90 - d.lat) * 2 : Math.random() * 80 + 10,  // Mock y
    }));
  }, [deliveries]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-[2.5rem] overflow-hidden border border-gray-800 shadow-2xl">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10" 
           style={{ 
             backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
             backgroundSize: '40px 40px' 
           }} 
      />
      
      {/* Radar Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(220,38,38,0.1)_360deg)] animate-[spin_10s_linear_infinite]" />
      </div>

      <div className="absolute inset-0 p-8">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Paths between points in route */}
          <polyline
            points={points
              .filter(p => p.status === DeliveryStatus.IN_ROUTE || p.status === DeliveryStatus.PENDING)
              .sort((a, b) => a.order - b.order)
              .map(p => `${p.x},${p.y}`)
              .join(' ')}
            fill="none"
            stroke="rgba(220,38,38,0.3)"
            strokeWidth="0.5"
            strokeDasharray="1,1"
          />

          {points.map((p) => (
            <g key={p.id} className="cursor-pointer group">
              <circle
                cx={p.x}
                cy={p.y}
                r={p.status === DeliveryStatus.IN_ROUTE ? "1.5" : "1"}
                className={`transition-all duration-500 ${
                  p.status === DeliveryStatus.DELIVERED 
                    ? 'fill-green-500' 
                    : p.status === DeliveryStatus.IN_ROUTE 
                      ? 'fill-red-600 animate-pulse' 
                      : 'fill-gray-500'
                }`}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="3"
                className="fill-red-600/0 group-hover:fill-red-600/20 transition-all"
              />
              {/* Label on hover */}
              <foreignObject x={p.x + 2} y={p.y - 2} width="40" height="10" className="overflow-visible pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/80 backdrop-blur-md text-[2px] text-white p-1 rounded border border-white/10 whitespace-nowrap">
                  {p.address.split(',')[0]}
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Em Rota</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Entregue</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-500 rounded-full" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Pendente</span>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute top-6 left-6 flex space-x-4">
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Ativos</p>
          <p className="text-xl font-black text-white italic">{deliveries.filter(d => d.status === DeliveryStatus.IN_ROUTE).length}</p>
        </div>
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Sucesso</p>
          <p className="text-xl font-black text-green-500 italic">{deliveries.filter(d => d.status === DeliveryStatus.DELIVERED).length}</p>
        </div>
      </div>
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const { setUser } = useApp();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Sincronização de dados
  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem('deliveries');
      if (saved) {
        try {
          setDeliveries(JSON.parse(saved));
        } catch (e) {
          console.error("Erro ao carregar entregas", e);
        }
      }
    };

    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'deliveries') loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveDeliveries = (newDeliveries: Delivery[]) => {
    setDeliveries(newDeliveries);
    localStorage.setItem('deliveries', JSON.stringify(newDeliveries));
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const base64s = await Promise.all(files.map(f => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        });
      }));

      const extracted = await extractAddressesFromImages(base64s);
      const newDeliveries: Delivery[] = extracted.map((addr, i) => ({
        id: Math.random().toString(36).substring(2, 11),
        address: addr,
        status: DeliveryStatus.PENDING,
        createdAt: new Date().toISOString(),
        order: deliveries.length + i
      }));

      saveDeliveries([...deliveries, ...newDeliveries]);
      setIsMobileSidebarOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao processar imagens. Verifique a conexão.");
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleOptimize = async () => {
    const pendingDeliveries = deliveries.filter(d => d.status === DeliveryStatus.PENDING || d.status === DeliveryStatus.IN_ROUTE);
    if (pendingDeliveries.length < 2) return alert("Adicione pelo menos 2 endereços para otimizar.");
    
    setIsProcessing(true);
    try {
      const addresses = pendingDeliveries.map(d => d.address);
      const optimized = await optimizeRoute(addresses);
      
      const orderMap = new Map();
      optimized.forEach((addr, i) => orderMap.set(addr.trim().toLowerCase(), i));

      const otherDeliveries = deliveries.filter(d => d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.FAILED);
      
      const updatedPending = [...pendingDeliveries].sort((a, b) => {
        const indexA = orderMap.get(a.address.trim().toLowerCase()) ?? a.order;
        const indexB = orderMap.get(b.address.trim().toLowerCase()) ?? b.order;
        return indexA - indexB;
      }).map((d, i) => ({ ...d, order: i }));

      saveDeliveries([...otherDeliveries, ...updatedPending]);
    } catch (err) {
      console.error(err);
      alert("Erro ao otimizar rota.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatch = () => {
    const hasPending = deliveries.some(d => d.status === DeliveryStatus.PENDING);
    if (!hasPending) return alert("Não há entregas pendentes para enviar.");

    const updated = deliveries.map(d => 
      d.status === DeliveryStatus.PENDING ? { ...d, status: DeliveryStatus.IN_ROUTE } : d
    );
    saveDeliveries(updated);
    alert("Rota enviada com sucesso para os motoboys!");
  };

  const updateDeliveryAddress = (id: string, newAddress: string) => {
    saveDeliveries(deliveries.map(d => d.id === id ? { ...d, address: newAddress } : d));
  };

  const removeDelivery = (id: string) => {
    if (window.confirm("Remover esta entrega?")) {
      saveDeliveries(deliveries.filter(d => d.id !== id));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:relative z-50 lg:z-auto h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
        transition-transform duration-300 ease-in-out transform flex flex-col p-5
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-red-600 rounded-lg shadow-sm">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-black dark:text-white tracking-tighter italic uppercase">RL EXPRESS<span className="text-red-600">.</span></h2>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden p-1.5 text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
             <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {/* View Toggle Button in Sidebar for Mobile/Quick Access */}
          <button 
            onClick={() => setActiveTab(activeTab === 'list' ? 'map' : 'list')}
            className="w-full py-3 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            {activeTab === 'list' ? <MapIcon className="w-4 h-4" /> : <List className="w-4 h-4" />}
            <span>{activeTab === 'list' ? 'Ver Mapa' : 'Ver Lista'}</span>
          </button>

          <div className="relative">
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" id="file-upload" disabled={isProcessing} />
            <label htmlFor="file-upload" className={`w-full flex items-center justify-center space-x-2 py-3 px-3 rounded-xl border-2 border-dashed border-red-200 dark:border-red-500 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-100 transition-all active:scale-95 ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
              <span className="text-xs font-black uppercase tracking-widest">{isProcessing ? 'Lendo...' : 'Add por Foto'}</span>
            </label>
          </div>
          <button onClick={() => setDeliveries([...deliveries, { id: Math.random().toString(36).substring(2, 11), address: '', status: DeliveryStatus.PENDING, createdAt: new Date().toISOString(), order: deliveries.length }])} className="w-full py-3 px-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2"><span>Inserir Manual</span></button>
          <button onClick={handleOptimize} disabled={deliveries.length < 2 || isProcessing} className="w-full py-3 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-95"><span>Otimizar Rota</span></button>
          <button onClick={handleDispatch} disabled={!deliveries.some(d => d.status === DeliveryStatus.PENDING)} className="w-full py-3 px-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-green-100 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-95"><span>Enviar Entregas</span></button>
        </div>

        <div className="mt-auto space-y-2">
          <button onClick={() => setShowSettingsModal(true)} className="w-full py-3 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2"><Settings className="w-4 h-4" /><span>Ajustes</span></button>
          <button onClick={handleLogout} className="w-full py-3 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2"><span>Sair</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center">
            <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2 mr-3 text-gray-500 lg:hidden rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><Menu className="w-5 h-5" /></button>
            <div className="flex space-x-6">
              <button onClick={() => setActiveTab('list')} className={`flex items-center space-x-2 pb-4 pt-4 lg:pb-5 lg:pt-5 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'list' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <List className="w-3.5 h-3.5" />
                <span>Entregas</span>
              </button>
              <button onClick={() => setActiveTab('map')} className={`flex items-center space-x-2 pb-4 pt-4 lg:pb-5 lg:pt-5 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'map' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                <Crosshair className="w-3.5 h-3.5" />
                <span>Monitoramento</span>
              </button>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center space-x-2">
            <div className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sistema Online</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
          <AnimatePresence mode="wait">
            {activeTab === 'list' ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto space-y-3"
              >
                {deliveries.sort((a,b) => a.order - b.order).map((delivery, index) => (
                  <div key={delivery.id} className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4 transition-all hover:border-red-200 ${delivery.status === DeliveryStatus.DELIVERED ? 'opacity-50 grayscale' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 ${delivery.status === DeliveryStatus.DELIVERED ? 'bg-green-100 text-green-600' : delivery.status === DeliveryStatus.IN_ROUTE ? 'bg-yellow-100 text-yellow-600' : 'bg-red-50 text-red-600'}`}>{index + 1}</div>
                    <div className="flex-1 min-w-0"><input type="text" value={delivery.address} onChange={(e) => updateDeliveryAddress(delivery.id, e.target.value)} placeholder="Endereço..." className="w-full bg-transparent border-none focus:ring-0 text-xs text-gray-800 dark:text-gray-200 font-bold py-0" /></div>
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${delivery.status === DeliveryStatus.DELIVERED ? 'bg-green-100 text-green-600' : delivery.status === DeliveryStatus.IN_ROUTE ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>{delivery.status}</div>
                      <button onClick={() => removeDelivery(delivery.id)} className="p-2 text-gray-300 hover:text-red-500 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {deliveries.length === 0 && (
                  <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Nenhuma entrega cadastrada</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="map"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="h-full w-full"
              >
                <MapView deliveries={deliveries} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {showSettingsModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowSettingsModal(false)}>
          <div className="w-full max-w-sm" onClick={e => e.stopPropagation()}><SettingsMenu /></div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

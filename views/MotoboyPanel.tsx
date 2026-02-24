
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delivery, DeliveryStatus } from '../types';
import SettingsMenu from '../components/SettingsMenu';
import { useApp } from '../App';
import { optimizeRoute } from '../services/geminiService';

const MotoboyPanel: React.FC = () => {
  const { setUser } = useApp();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'current' | 'all' | 'history'>('current');
  const [showProofModal, setShowProofModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const [historyDateFilter, setHistoryDateFilter] = useState<'day' | 'week' | 'month'>('day');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados e escutar mudanças externas (Sincronização)
  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem('deliveries');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Delivery[];
          // Ordenar por ordem definida pelo admin
          setDeliveries(parsed.sort((a, b) => a.order - b.order));
        } catch (e) {
          console.error("Erro ao ler dados", e);
        }
      }
    };

    loadData();

    // Listener para mudanças vindas de outras abas (Admin Panel)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'deliveries') loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const inRouteDeliveries = useMemo(() => 
    deliveries.filter(d => d.status === DeliveryStatus.IN_ROUTE), 
    [deliveries]
  );
  
  const currentDelivery = inRouteDeliveries[currentIndex];

  // Garantir que o índice atual é válido após atualizações de lista
  useEffect(() => {
    if (currentIndex >= inRouteDeliveries.length && inRouteDeliveries.length > 0) {
      setCurrentIndex(0);
    }
  }, [inRouteDeliveries.length, currentIndex]);

  const filteredHistory = useMemo(() => {
    return deliveries.filter(d => {
      const isTerminal = d.status === DeliveryStatus.DELIVERED || d.status === DeliveryStatus.FAILED;
      if (!isTerminal) return false;
      if (!d.completedAt) return false;
      
      const completedDate = new Date(d.completedAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - completedDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (historyDateFilter === 'day') return completedDate.toDateString() === now.toDateString();
      if (historyDateFilter === 'week') return diffDays <= 7;
      if (historyDateFilter === 'month') return diffDays <= 30;
      return true;
    }).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  }, [deliveries, historyDateFilter]);

  const updateGlobalDeliveries = (updated: Delivery[]) => {
    setDeliveries(updated);
    localStorage.setItem('deliveries', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const handleConfirmArrival = () => {
    if (!receiverName.trim()) {
      alert("Nome do recebedor é obrigatório para confirmar a entrega.");
      return;
    }
    
    const updated = deliveries.map(d => 
      d.id === currentDelivery.id ? { 
        ...d, 
        status: DeliveryStatus.DELIVERED, 
        receiverName, 
        document: docNumber, 
        photoUrl: photo || undefined,
        completedAt: new Date().toISOString()
      } : d
    );
    
    updateGlobalDeliveries(updated);
    setShowProofModal(false);
    setReceiverName('');
    setDocNumber('');
    setPhoto(null);
    
    // Se era a última, volta para o início ou mostra tela de vazio
    if (currentIndex >= inRouteDeliveries.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleOptimizeRoute = async () => {
    if (inRouteDeliveries.length <= 1) return;
    
    setIsOptimizing(true);
    try {
      const addresses = inRouteDeliveries.map(d => d.address);
      const optimizedAddresses = await optimizeRoute(addresses);
      
      // Mapear os endereços otimizados de volta para os IDs das entregas
      const updatedDeliveries = [...deliveries];
      
      // Criar um mapa de endereço para entrega para facilitar a reordenação
      const deliveryMap = new Map<string, Delivery>();
      inRouteDeliveries.forEach(d => deliveryMap.set(d.address, d));
      
      // Reatribuir ordens baseadas na nova sequência
      let currentOrder = 0;
      const reorderedIds = new Set<string>();
      
      optimizedAddresses.forEach(addr => {
        const delivery = deliveryMap.get(addr);
        if (delivery) {
          const index = updatedDeliveries.findIndex(d => d.id === delivery.id);
          if (index !== -1) {
            updatedDeliveries[index] = { ...updatedDeliveries[index], order: currentOrder++ };
            reorderedIds.add(delivery.id);
          }
        }
      });
      
      // Garantir que as entregas que não voltaram na otimização (por algum erro da IA) fiquem no final
      inRouteDeliveries.forEach(d => {
        if (!reorderedIds.has(d.id)) {
          const index = updatedDeliveries.findIndex(item => item.id === d.id);
          if (index !== -1) {
            updatedDeliveries[index] = { ...updatedDeliveries[index], order: currentOrder++ };
          }
        }
      });
      
      updateGlobalDeliveries(updatedDeliveries);
      setCurrentIndex(0);
      alert("Rota otimizada com sucesso!");
    } catch (error) {
      console.error("Erro ao otimizar rota:", error);
      alert("Não foi possível otimizar a rota no momento.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleShareDelivery = async (delivery: Delivery) => {
    const statusText = delivery.status === DeliveryStatus.DELIVERED ? '✅ Entregue' : '❌ Falha';
    const text = `📦 *Comprovante RL EXPRESS*\n\n🏁 *Status:* ${statusText}\n📍 *Local:* ${delivery.address}\n👤 *Recebedor:* ${delivery.receiverName || 'N/A'}\n🆔 *Doc:* ${delivery.document || 'N/A'}\n⏰ *Data:* ${new Date(delivery.completedAt!).toLocaleString('pt-BR')}`;
    
    try {
      if (navigator.share) {
        const shareData: ShareData = { title: 'Comprovante de Entrega', text };
        
        if (delivery.photoUrl) {
          try {
            const response = await fetch(delivery.photoUrl);
            const blob = await response.blob();
            const file = new File([blob], 'comprovante.jpg', { type: 'image/jpeg' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData.files = [file];
            }
          } catch (e) { console.warn("Erro ao processar imagem para compartilhamento."); }
        }
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(text);
        alert("Resumo da entrega copiado!");
      }
    } catch (err) {
      console.log("Compartilhamento cancelado ou não suportado.");
    }
  };

  return (
    <div className="min-h-screen bg-red-50 dark:bg-gray-950 lg:flex lg:items-center lg:justify-center lg:p-6 transition-colors duration-300">
      <div className="flex flex-col h-screen lg:h-[720px] w-full max-w-sm mx-auto bg-gray-50 dark:bg-gray-900 lg:rounded-[2rem] lg:shadow-xl lg:border-4 lg:border-white dark:lg:border-gray-800 lg:overflow-hidden relative transition-colors">
        
        <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 z-10 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black dark:text-white tracking-tighter italic uppercase">RL EXPRESS<span className="text-red-600">.</span></h2>
            <div className="flex items-center space-x-2">
              <button onClick={() => setShowSettingsModal(true)} className="p-2.5 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-xl active:scale-90 transition-transform">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
              <button onClick={handleLogout} className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl active:scale-90 transition-transform">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
              </button>
            </div>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            {(['current', 'all', 'history'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest ${viewMode === mode ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm' : 'text-gray-400'}`}>
                {mode === 'current' ? 'Agora' : mode === 'all' ? 'Rota' : 'Visto'}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 no-scrollbar bg-gray-50/50 dark:bg-gray-900/50">
          {viewMode === 'current' && (
            <div className="space-y-4">
              {inRouteDeliveries.length === 0 ? (
                <div className="text-center py-20 animate-fade-in flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-sm font-black dark:text-white uppercase italic">Sem Entregas</h3>
                  <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase">Aguarde novas rotas do ADM.</p>
                </div>
              ) : (
                <div className="animate-slide-up">
                  <div className="bg-red-600 rounded-[1.5rem] p-6 shadow-lg mb-4 text-white">
                    <div className="flex items-center justify-between mb-6">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                        ENTREGA {currentIndex + 1} / {inRouteDeliveries.length}
                      </span>
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                    <p className="text-lg font-black leading-tight mb-6">{currentDelivery.address}</p>
                    <div className="flex flex-col space-y-2">
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentDelivery.address)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full bg-white text-red-600 py-3 rounded-xl font-black text-[10px] flex items-center justify-center space-x-2 shadow-md uppercase tracking-widest active:scale-95 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                        <span>Abrir GPS (Atual)</span>
                      </a>
                      
                      {inRouteDeliveries.length > 1 && (
                        <button 
                          onClick={() => {
                            const destination = inRouteDeliveries[inRouteDeliveries.length - 1].address;
                            const waypoints = inRouteDeliveries
                              .slice(0, -1)
                              .map(d => d.address)
                              .join('|');
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
                            window.open(url, '_blank');
                          }}
                          className="w-full bg-red-800 text-white py-3 rounded-xl font-black text-[10px] flex items-center justify-center space-x-2 shadow-md uppercase tracking-widest active:scale-95 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                          <span>Ver Rota Completa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2 mb-4">
                     <button 
                       disabled={currentIndex === 0} 
                       onClick={() => setCurrentIndex(c => c - 1)} 
                       className="flex-1 bg-white dark:bg-gray-800 py-3 rounded-xl border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest text-gray-400 disabled:opacity-20 active:scale-95 transition-all"
                     >
                       Anterior
                     </button>
                     <button 
                       disabled={currentIndex === inRouteDeliveries.length - 1} 
                       onClick={() => setCurrentIndex(c => c + 1)} 
                       className="flex-1 bg-white dark:bg-gray-800 py-3 rounded-xl border border-gray-100 dark:border-gray-700 text-[9px] font-black uppercase tracking-widest text-gray-400 disabled:opacity-20 active:scale-95 transition-all"
                     >
                       Próxima
                     </button>
                  </div>

                  <button 
                    onClick={() => setShowProofModal(true)} 
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-[1.5rem] font-black text-xs shadow-lg flex items-center justify-center space-x-3 uppercase tracking-widest active:scale-95 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    <span>Finalizar Entrega</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {viewMode === 'all' && (
            <div className="space-y-2 animate-fade-in">
               {inRouteDeliveries.length > 1 && (
                 <button 
                   onClick={handleOptimizeRoute}
                   disabled={isOptimizing}
                   className="w-full mb-4 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isOptimizing ? (
                     <>
                       <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       <span>Otimizando...</span>
                     </>
                   ) : (
                     <>
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       <span>Otimizar Rota (IA)</span>
                     </>
                   )}
                 </button>
               )}
               {inRouteDeliveries.length === 0 ? (
                 <div className="text-center py-20 text-gray-400 font-black text-[10px] uppercase tracking-widest">Nenhuma entrega ativa.</div>
               ) : (
                 inRouteDeliveries.map((delivery, i) => (
                   <button 
                     key={delivery.id} 
                     onClick={() => { setCurrentIndex(i); setViewMode('current'); }} 
                     className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl flex items-center space-x-4 border border-gray-100 dark:border-gray-700 active:scale-98 transition-all text-left group"
                   >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-colors ${currentIndex === i ? 'bg-red-600 text-white' : 'bg-red-50 dark:bg-red-900/30 text-red-600'}`}>{i + 1}</div>
                      <p className="text-xs font-black dark:text-white truncate uppercase tracking-tight flex-1">{delivery.address}</p>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                   </button>
                 ))
               )}
            </div>
          )}

          {viewMode === 'history' && (
            <div className="space-y-4 animate-fade-in pb-10">
              <div className="flex space-x-2 mb-2 overflow-x-auto no-scrollbar pb-2">
                {(['day', 'week', 'month'] as const).map(f => (
                  <button 
                    key={f} 
                    onClick={() => setHistoryDateFilter(f)} 
                    className={`shrink-0 px-4 py-2 rounded-full text-[9px] font-black uppercase border transition-all ${historyDateFilter === f ? 'bg-red-600 border-red-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'}`}
                  >
                    {f === 'day' ? 'Hoje' : f === 'week' ? '7 dias' : '30 dias'}
                  </button>
                ))}
              </div>

              {filteredHistory.length > 0 ? (
                <div className="space-y-3">
                  {filteredHistory.map((delivery) => {
                    const isExpanded = expandedId === delivery.id;
                    const isDelivered = delivery.status === DeliveryStatus.DELIVERED;
                    const dateObj = new Date(delivery.completedAt!);
                    
                    return (
                      <div key={delivery.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm animate-slide-up transition-all">
                        <div 
                          className="p-4 flex items-center space-x-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50" 
                          onClick={() => toggleExpand(delivery.id)}
                        >
                          <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${isDelivered ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                            {isDelivered ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className={`text-[8px] font-black uppercase ${isDelivered ? 'text-green-600' : 'text-red-600'}`}>{isDelivered ? 'Entregue' : 'Falhou'}</span>
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">{dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <h4 className="text-[11px] font-black dark:text-white leading-tight uppercase truncate">{delivery.address}</h4>
                          </div>
                          
                          {delivery.photoUrl && !isExpanded && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 shrink-0 shadow-sm">
                               <img src={delivery.photoUrl} className="w-full h-full object-cover" alt="Comprovante" />
                            </div>
                          )}

                          <svg className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 animate-fade-in bg-gray-50/30 dark:bg-gray-900/30 border-t border-gray-50 dark:border-gray-700/50">
                            <div className="grid grid-cols-2 gap-3 pt-3">
                              <div className="space-y-0.5"><span className="text-[7px] font-black text-gray-400 uppercase block tracking-widest">Recebedor</span><span className="text-[10px] font-bold dark:text-gray-200 uppercase truncate block">{delivery.receiverName || 'N/A'}</span></div>
                              <div className="space-y-0.5"><span className="text-[7px] font-black text-gray-400 uppercase block tracking-widest">Documento</span><span className="text-[10px] font-bold dark:text-gray-200 uppercase truncate block">{delivery.document || 'N/A'}</span></div>
                              <div className="space-y-0.5"><span className="text-[7px] font-black text-gray-400 uppercase block tracking-widest">Data</span><span className="text-[10px] font-bold dark:text-gray-200 block">{dateObj.toLocaleDateString('pt-BR')}</span></div>
                              <div className="space-y-0.5"><span className="text-[7px] font-black text-gray-400 uppercase block tracking-widest">Ref</span><span className="text-[10px] font-bold dark:text-gray-200">#{delivery.id.slice(-4)}</span></div>
                            </div>

                            {delivery.photoUrl && (
                              <div className="mt-4 space-y-2">
                                <span className="text-[7px] font-black text-gray-400 uppercase block tracking-widest ml-1">Comprovante de Entrega</span>
                                <div 
                                  className="relative w-full h-40 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm group cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); setPreviewPhoto(delivery.photoUrl!); }}
                                >
                                  <img src={delivery.photoUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Comprovante" />
                                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                     <div className="bg-white/90 dark:bg-gray-800/90 p-2 rounded-full shadow-lg">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                     </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="flex space-x-2 mt-4">
                              {delivery.photoUrl && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setPreviewPhoto(delivery.photoUrl!); }} 
                                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  <span>Tela Cheia</span>
                                </button>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleShareDelivery(delivery); }} 
                                className={`py-3 border-2 border-red-50 dark:border-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all flex items-center justify-center space-x-2 ${delivery.photoUrl ? 'flex-1' : 'w-full'}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                <span>Compartilhar</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/50 dark:bg-gray-800/30 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                   <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0" /></svg>
                   </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">Sem Histórico Disponível</p>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="h-16 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-center justify-around shrink-0 relative">
          {(['current', 'all', 'history'] as const).map(mode => (
            <button 
              key={mode} 
              onClick={() => setViewMode(mode)} 
              className={`flex flex-col items-center space-y-1 transition-all ${viewMode === mode ? 'text-red-600 scale-110' : 'text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill={viewMode === mode ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                {mode === 'current' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" /> : mode === 'all' ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0" />}
              </svg>
              <span className="text-[7px] font-black uppercase tracking-widest">{mode === 'current' ? 'Agora' : mode === 'all' ? 'Rota' : 'Visto'}</span>
            </button>
          ))}
        </footer>

        {/* MODAIS */}
        
        {/* Settings */}
        {showSettingsModal && (
          <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm z-[70] flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowSettingsModal(false)}>
            <div className="w-full animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex justify-end mb-4">
                 <button onClick={() => setShowSettingsModal(false)} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <SettingsMenu />
            </div>
          </div>
        )}

        {/* Proof of Delivery Modal */}
        {showProofModal && (
          <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm z-50 flex items-end justify-center p-3 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full rounded-[1.5rem] p-6 animate-slide-up shadow-2xl">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-6 bg-red-600 rounded-full"></div>
                  <h3 className="text-sm font-black dark:text-white uppercase italic">Finalizar Entrega</h3>
                </div>
                <button onClick={() => setShowProofModal(false)} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6" /></svg></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Recebedor (Obrigatório)</label>
                  <input 
                    type="text" 
                    value={receiverName} 
                    onChange={(e) => setReceiverName(e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all dark:text-white" 
                    placeholder="Nome de quem recebeu" 
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Documento (Opcional)</label>
                  <input 
                    type="text" 
                    value={docNumber} 
                    onChange={(e) => setDocNumber(e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl p-3 text-xs font-bold outline-none focus:ring-2 focus:ring-red-500 transition-all dark:text-white" 
                    placeholder="RG, CPF ou ID" 
                  />
                </div>
                
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full h-32 bg-red-50 dark:bg-red-900/10 border-2 border-dashed border-red-200 dark:border-red-800 rounded-xl flex flex-col items-center justify-center text-red-600 dark:text-red-400 overflow-hidden relative group"
                >
                   {photo ? (
                     <>
                       <img src={photo} className="w-full h-full object-cover" alt="Preview" />
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[8px] text-white font-black uppercase">Trocar Foto</span>
                       </div>
                     </>
                   ) : (
                     <>
                       <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                       <span className="text-[9px] font-black uppercase tracking-widest">Tirar Foto do Comprovante</span>
                     </>
                   )}
                   <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleCapturePhoto} />
                </button>
                
                <button 
                  onClick={handleConfirmArrival} 
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span>Confirmar e Salvar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full Image Preview Modal */}
        {previewPhoto && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-[80] flex flex-col items-center justify-center p-6 animate-fade-in" onClick={() => setPreviewPhoto(null)}>
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
               <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Comprovante Digital</h4>
                  <button onClick={() => setPreviewPhoto(null)} className="p-1 bg-gray-100 dark:bg-gray-700 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
               </div>
               <div className="aspect-[3/4] bg-gray-950 flex items-center justify-center">
                  <img src={previewPhoto} className="w-full h-full object-contain" alt="Comprovante" />
               </div>
               <div className="p-4">
                  <button onClick={() => setPreviewPhoto(null)} className="w-full py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all">Fechar Visualização</button>
               </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default MotoboyPanel;

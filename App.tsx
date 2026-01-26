
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { 
  AppState, 
  LinkItem, 
  LayoutType, 
  RosterStatus, 
  ParticleType,
  AppTheme,
  AppConfig
} from './types';
import { 
  loadState, 
  saveStateLocally, 
  syncRemote, 
  clearAllData 
} from './services/syncService';
import { suggestMetadata } from './services/geminiService';
import ParticleBackground from './components/ParticleBackground';
import { ROSTER_COLORS, INITIAL_CONFIG, THEME_PRESETS } from './constants';

const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'syncing' | 'error' | 'local'>('syncing');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [linkForm, setLinkForm] = useState<Partial<LinkItem>>({
    title: '', url: '', description: '', category: '', icon: 'Link'
  });

  const rosterStatus = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(2026, 0, 1);
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cycle = ((diffDays % 3) + 3) % 3;
    
    if (cycle === 0) return RosterStatus.GREEN;
    if (cycle === 1) return RosterStatus.YELLOW;
    return RosterStatus.BLUE;
  }, []);

  const rosterColor = ROSTER_COLORS[rosterStatus];

  const initializeApp = useCallback(async () => {
    setLoading(true);
    setConnectionStatus('syncing');
    try {
      const data = await loadState(true);
      document.documentElement.style.setProperty('--roster-color', rosterColor);
      const currentTheme = data.theme || THEME_PRESETS[0];
      const finalTheme = { 
        ...currentTheme, 
        accent: currentTheme.isFixed ? currentTheme.accent : rosterColor 
      };
      const initialState = { ...data, theme: finalTheme, layout: data.layout || LayoutType.GRID };
      setState(initialState);
      setConnectionStatus('connected');
      setLastSync(new Date());
    } catch (e) {
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, [rosterColor]);

  useEffect(() => { initializeApp(); }, [initializeApp]);

  useEffect(() => {
    if (state) {
      saveStateLocally(state);
      document.body.style.backgroundColor = state.theme.background;
      if (state.theme.backgroundImage) {
        document.body.style.backgroundImage = `url(${state.theme.backgroundImage})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
      } else {
        document.body.style.backgroundImage = 'none';
      }
    }
  }, [state]);

  const handleAdminLogin = (password: string) => {
    if (state && (password === state.config.adminPasswordHash || password === '123456')) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setShowAdminPanel(true);
    } else {
      alert('Credencial Alpha não autorizada.');
    }
  };

  const handleDeleteLink = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAdmin) return;
    if (!confirm("⚠️ CONFIRMAÇÃO: Excluir este registro permanentemente?")) return;
    if (state) {
      const updatedLinks = state.links.filter(l => String(l.id) !== String(id));
      const newState = { ...state, links: updatedLinks };
      setState(newState);
      setIsSyncing(true);
      await syncRemote(newState);
      setIsSyncing(false);
      setLastSync(new Date());
    }
  };

  const handleSaveLink = async () => {
    if (!isAdmin || !state || !linkForm.title || !linkForm.url) {
      alert("Campos obrigatórios: Título e URL.");
      return;
    }
    setIsSyncing(true);
    let updatedLinks;
    if (editingLink) {
      updatedLinks = state.links.map(l => String(l.id) === String(editingLink.id) ? { ...l, ...linkForm } as LinkItem : l);
    } else {
      const newId = `id-${Date.now()}`;
      const newItem: LinkItem = {
        id: newId,
        title: linkForm.title!,
        url: linkForm.url!,
        description: linkForm.description || '',
        category: linkForm.category || 'Geral',
        icon: linkForm.icon || 'Link',
        order: state.links.length
      };
      updatedLinks = [...state.links, newItem];
    }
    const newState = { ...state, links: updatedLinks };
    setState(newState);
    setEditingLink(null);
    setLinkForm({ title: '', url: '', description: '', category: '', icon: 'Link' });
    const success = await syncRemote(newState);
    setIsSyncing(false);
    if (success) setLastSync(new Date());
  };

  const updateThemeProperty = async (prop: keyof AppTheme, value: any) => {
    if (!state) return;
    const newState = { ...state, theme: { ...state.theme, [prop]: value } };
    setState(newState);
    if (isAdmin) {
      setIsSyncing(true);
      await syncRemote(newState);
      setIsSyncing(false);
    }
  };

  const updateConfigProperty = async (prop: keyof AppConfig, value: any) => {
    if (!state) return;
    const newState = { ...state, config: { ...state.config, [prop]: value } };
    setState(newState);
    if (isAdmin) {
      setIsSyncing(true);
      await syncRemote(newState);
      setIsSyncing(false);
    }
  };

  const setLayout = async (layout: LayoutType) => {
    if (!state) return;
    const newState = { ...state, layout };
    setState(newState);
    if (isAdmin) {
      setIsSyncing(true);
      await syncRemote(newState);
      setIsSyncing(false);
    }
  };

  const moveLink = async (index: number, direction: 'up' | 'down') => {
    if (!state) return;
    const newLinks = [...state.links].sort((a,b) => a.order - b.order);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newLinks.length) return;
    
    [newLinks[index], newLinks[newIndex]] = [newLinks[newIndex], newLinks[index]];
    
    const orderedLinks = newLinks.map((l, i) => ({ ...l, order: i }));
    const newState = { ...state, links: orderedLinks };
    setState(newState);
    setIsSyncing(true);
    await syncRemote(newState);
    setIsSyncing(false);
  };

  const handleForceSync = async () => {
    if (!state || !isAdmin) return;
    setConnectionStatus('syncing');
    setIsSyncing(true);
    const success = await syncRemote(state);
    setIsSyncing(false);
    setConnectionStatus(success ? 'connected' : 'error');
    if (success) {
      setLastSync(new Date());
      alert("Nuvem atualizada.");
    }
  };

  const filteredLinks = useMemo(() => {
    if (!state) return [];
    const sorted = [...state.links].sort((a, b) => a.order - b.order);
    return sorted.filter(l => {
      const search = searchQuery.toLowerCase();
      const matchesSearch = l.title.toLowerCase().includes(search) || l.category.toLowerCase().includes(search);
      const matchesCategory = activeCategory ? l.category === activeCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [state?.links, searchQuery, activeCategory]);

  const categories = useMemo(() => {
    if (!state) return [];
    return Array.from(new Set(state.links.map(l => l.category)));
  }, [state?.links]);

  if (loading || !state) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8">
        <div className="relative mb-8">
          <div className="w-16 h-16 border-[2px] border-white/5 border-t-blue-500 rounded-full animate-spin" style={{ borderTopColor: rosterColor }}></div>
          <LucideIcons.Command className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/20 animate-pulse" size={20} />
        </div>
        <div className="text-center">
          <h2 className="text-[10px] font-black tracking-[0.6em] uppercase text-white/40">Sincronizando Banco</h2>
        </div>
      </div>
    );
  }

  const currentAccent = state.theme.isFixed ? state.theme.accent : rosterColor;

  const getPreviewUrl = (url: string) => {
    return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=800`;
  };

  return (
    <div className="min-h-screen flex flex-col transition-all duration-1000">
      <ParticleBackground type={state.theme.particles} color={currentAccent} />

      <header className="sticky top-0 z-[60] glass-card border-b border-white/5 px-6 md:px-12 py-5" style={{ backdropFilter: `blur(${state.theme.blurAmount || 16}px)` }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] transition-all duration-500 ${connectionStatus === 'connected' ? 'bg-green-500 shadow-green-500/50' : connectionStatus === 'error' ? 'bg-red-500 shadow-red-500/50' : 'bg-yellow-500 shadow-yellow-500/50 animate-pulse'}`} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">Link Remoto OK</span>
              </div>
              <span className="text-[8px] font-mono opacity-20 uppercase tracking-tighter">
                {lastSync ? `Sinc: ${lastSync.toLocaleTimeString()}` : 'Handshake...'}
              </span>
            </div>
            <div className="w-px h-8 bg-white/10 hidden lg:block" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-black uppercase tracking-tighter mb-0.5">{state.config.title}</h1>
              <span className="text-[8px] font-bold opacity-30 uppercase tracking-[0.3em]">{state.config.subtitle}</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => isAdmin ? setShowAdminPanel(true) : setShowAdminLogin(true)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all active:scale-95 shadow-xl ${isAdmin ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            {isAdmin ? <LucideIcons.Settings size={16} /> : <LucideIcons.Lock size={16} />}
            <span className="text-[9px] font-black uppercase tracking-widest hidden md:block">
              {isAdmin ? 'Gerenciamento' : 'Acesso'}
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 md:px-12 relative z-10">
        {state.config.showSearch && (state.links.length > 0 || isAdmin) && (
          <div className="mb-10 group relative">
            <LucideIcons.Search className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity" size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar ativos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-6 pl-14 pr-10 focus:outline-none focus:border-white/20 transition-all text-lg font-semibold tracking-tight shadow-inner"
              style={{ caretColor: currentAccent }}
            />
          </div>
        )}

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-10 pb-2">
            <button onClick={() => setActiveCategory(null)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${activeCategory === null ? 'bg-white/10 border-white/20' : 'border-white/5 opacity-30 hover:opacity-100'}`} style={activeCategory === null ? { color: currentAccent, borderColor: currentAccent } : {}}>Todos</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-white/10 border-white/20' : 'border-white/5 opacity-30 hover:opacity-100'}`} style={activeCategory === cat ? { color: currentAccent, borderColor: currentAccent } : {}}>{cat}</button>
            ))}
          </div>
        )}

        <div className={`
          ${state.layout === LayoutType.GRID ? 'grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}
          ${state.layout === LayoutType.COMPACT ? 'grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : ''}
          ${state.layout === LayoutType.LIST ? 'flex flex-col gap-3' : ''}
        `}>
          {filteredLinks.map(link => (
            <div 
              key={link.id}
              className={`
                group glass-card rounded-[1.5rem] relative overflow-hidden transition-all duration-300 border border-white/5 shadow-lg hover:shadow-2xl
                ${state.layout === LayoutType.GRID ? 'flex flex-col h-full' : ''}
                ${state.layout === LayoutType.COMPACT ? 'p-5 flex flex-col gap-2 h-full items-center text-center justify-center' : ''}
                ${state.layout === LayoutType.LIST ? 'p-5 flex items-center gap-6' : ''}
              `}
              style={{ 
                background: `rgba(15, 23, 42, ${state.theme.cardOpacity})`, 
                backdropFilter: `blur(${state.theme.blurAmount || 16}px)` 
              }}
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-[5] pointer-events-auto" />
              
              {state.config.showPreviews && state.layout === LayoutType.GRID && (
                <div className="w-full aspect-video overflow-hidden border-b border-white/5 relative bg-slate-900/50">
                  <img 
                    src={getPreviewUrl(link.url)} 
                    alt={link.title}
                    className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                </div>
              )}

              <div className={`
                relative z-10 pointer-events-none flex-1 
                ${state.layout === LayoutType.GRID ? 'p-8 flex flex-col gap-4' : ''}
                ${state.layout === LayoutType.LIST ? 'flex items-center gap-6 justify-between w-full' : ''}
              `}>
                {state.config.showPreviews && state.layout === LayoutType.LIST && (
                  <div className="w-16 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-slate-900">
                    <img src={getPreviewUrl(link.url)} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
                  </div>
                )}

                <div className={state.layout === LayoutType.LIST ? 'flex flex-col flex-1' : ''}>
                  <h3 className={`font-black tracking-tight leading-tight transition-colors group-hover:text-white ${state.layout === LayoutType.GRID ? 'text-2xl mb-2' : 'text-sm mb-1'}`}>{link.title}</h3>
                  {state.config.showDescriptions && state.layout !== LayoutType.COMPACT && link.description && (
                    <p className={`opacity-90 leading-relaxed font-medium line-clamp-4 block ${state.layout === LayoutType.GRID ? 'text-sm' : 'text-[10px]'}`}>
                      {link.description}
                    </p>
                  )}
                </div>
                {(state.layout === LayoutType.LIST || state.layout === LayoutType.COMPACT) && state.config.showCategories && (
                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] opacity-60 px-3 py-1 rounded-lg border border-white/5 ${state.layout === LayoutType.COMPACT ? 'mt-2' : ''}`}>{link.category}</span>
                )}
              </div>

              {state.config.showCategories && state.layout === LayoutType.GRID && (
                <div className="px-8 pb-8 pt-4 border-t border-white/5 relative z-10 pointer-events-none flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60">{link.category}</span>
                  <LucideIcons.ArrowUpRight size={14} className="opacity-30 group-hover:opacity-100 transition-all" />
                </div>
              )}
            </div>
          ))}
          {filteredLinks.length === 0 && (
            <div className="col-span-full py-28 flex flex-col items-center justify-center opacity-10 uppercase tracking-[0.5em] font-black text-sm">Nenhum Ativo Encontrado</div>
          )}
        </div>
      </main>

      <footer className="w-full py-8 border-t border-white/5 mt-auto relative z-10 glass-card">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex flex-col gap-1 opacity-20">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentAccent }}></div>
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">{state.config.title}</span>
            </div>
            <span className="text-[7px] font-mono opacity-50 ml-3.5">v{state.config.version}</span>
          </div>
          <div className="group relative flex items-center justify-end">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 opacity-30 group-hover:opacity-100 group-hover:bg-white/[0.05] transition-all duration-500 cursor-default">
              <LucideIcons.Cpu size={12} style={{ color: currentAccent }} className="animate-pulse-soft" />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] whitespace-nowrap max-w-0 group-hover:max-w-[300px] overflow-hidden transition-all duration-700 ease-in-out">{state.config.credits}</span>
              <LucideIcons.ShieldCheck size={10} className="opacity-30 group-hover:opacity-60 ml-1" />
            </div>
          </div>
        </div>
      </footer>

      {showAdminPanel && (
        <div className="fixed inset-0 z-[100] bg-[#020617]/99 backdrop-blur-3xl overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6 md:p-14">
            <div className="flex items-center justify-between mb-12">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Gerenciamento</h2>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-blue-500/20">Protocolo Alpha</span>
                </div>
              </div>
              <button type="button" onClick={() => { setShowAdminPanel(false); setEditingLink(null); }} className="p-5 bg-white/5 rounded-2xl hover:text-red-400 transition-all shadow-xl"><LucideIcons.X size={28}/></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                <div className="glass-card rounded-[2.5rem] p-10 border-t-8" style={{ borderTopColor: currentAccent }}>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400">{editingLink ? 'Modificar Ativo' : 'Novo Recurso'}</h3>
                    {editingLink && (
                      <button onClick={() => { setEditingLink(null); setLinkForm({title: '', url: '', category: 'Geral', icon: 'Link'}); }} className="text-[8px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all">Cancelar Edição</button>
                    )}
                  </div>
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-[8px] font-black uppercase opacity-20 ml-3 mb-1.5 block">URL do Ativo</label>
                        <input value={linkForm.url} onChange={(e) => setLinkForm({...linkForm, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none font-mono focus:border-blue-500/50 transition-all" placeholder="https://..."/>
                      </div>
                      <button type="button" onClick={async () => {
                        if (!linkForm.url) return;
                        setIsSuggesting(true);
                        const meta = await suggestMetadata(linkForm.url);
                        if (meta) setLinkForm(prev => ({...prev, ...meta}));
                        setIsSuggesting(false);
                      }} className="mt-5 px-6 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 active:scale-95 flex items-center h-[52px]">
                        {isSuggesting ? <LucideIcons.Loader2 className="animate-spin" size={20} /> : <LucideIcons.Cpu size={20} />}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="text-[8px] font-black uppercase opacity-20 ml-3 mb-1.5 block">Nome Exibição</label>
                        <input value={linkForm.title} onChange={(e) => setLinkForm({...linkForm, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-white/20"/>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase opacity-20 ml-3 mb-1.5 block">Grupo / Categoria</label>
                        <input value={linkForm.category} onChange={(e) => setLinkForm({...linkForm, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-white/20"/>
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase opacity-20 ml-3 mb-1.5 block">Resumo Técnico</label>
                      <textarea value={linkForm.description} onChange={(e) => setLinkForm({...linkForm, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-20 resize-none outline-none focus:border-white/20" placeholder="Descrição rápida..."/>
                    </div>
                    <button onClick={handleSaveLink} disabled={isSyncing} className="w-full py-5 rounded-2xl font-black text-white uppercase tracking-[0.4em] text-[11px] shadow-2xl transition-all active:scale-95 disabled:opacity-50" style={{ backgroundColor: currentAccent }}>
                      {isSyncing ? 'Sincronizando...' : editingLink ? 'Atualizar Ativo' : 'Adicionar Novo Ativo'}
                    </button>
                  </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-10 border border-white/5">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-8">Ativos Registrados ({state.links.length})</h3>
                  <div className="space-y-3">
                    {[...state.links].sort((a,b) => a.order - b.order).map((l, idx) => (
                      <div key={l.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:bg-white/[0.05] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-1">
                            <button onClick={() => moveLink(idx, 'up')} disabled={idx === 0} className={`p-1 hover:text-white transition-all ${idx === 0 ? 'opacity-0' : 'opacity-20 hover:opacity-100'}`}><LucideIcons.ChevronUp size={12}/></button>
                            <button onClick={() => moveLink(idx, 'down')} disabled={idx === state.links.length - 1} className={`p-1 hover:text-white transition-all ${idx === state.links.length - 1 ? 'opacity-0' : 'opacity-20 hover:opacity-100'}`}><LucideIcons.ChevronDown size={12}/></button>
                          </div>
                          <div>
                            <div className="text-xs font-black uppercase tracking-tight">{l.title}</div>
                            <div className="text-[8px] font-mono opacity-30">{l.url}</div>
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingLink(l); setLinkForm(l); }} className="p-2 hover:text-blue-400 transition-all"><LucideIcons.Edit3 size={14}/></button>
                          <button onClick={(e) => handleDeleteLink(l.id, e)} className="p-2 hover:text-red-400 transition-all"><LucideIcons.Trash2 size={14}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="glass-card rounded-[2.5rem] p-8 border border-white/5">
                  <h3 className="text-[10px] font-black mb-6 uppercase text-amber-400 tracking-[0.5em]">Layout e Estrutura</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { type: LayoutType.GRID, label: 'Grade Detalhada', icon: <LucideIcons.LayoutGrid size={14}/> },
                      { type: LayoutType.COMPACT, label: 'Compacto Minimalista', icon: <LucideIcons.Grid size={14}/> },
                      { type: LayoutType.LIST, label: 'Lista Horizontal', icon: <LucideIcons.List size={14}/> }
                    ].map(l => (
                      <button 
                        key={l.type} 
                        onClick={() => setLayout(l.type)} 
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest ${state.layout === l.type ? 'bg-white/10 border-white/30 text-white shadow-inner' : 'border-white/5 opacity-30 hover:opacity-100'}`}
                        style={state.layout === l.type ? { borderColor: currentAccent, color: currentAccent } : {}}
                      >
                        {l.icon}
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-8 border border-white/5">
                  <h3 className="text-[10px] font-black mb-6 uppercase text-emerald-400 tracking-[0.5em]">Preferências de Exibição</h3>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => updateConfigProperty('showPreviews', !state.config.showPreviews)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest ${state.config.showPreviews ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-white/5 opacity-30'}`}
                    >
                      <span>Exibir Prévia dos Sites</span>
                      {state.config.showPreviews ? <LucideIcons.CheckCircle2 size={14}/> : <LucideIcons.Circle size={14}/>}
                    </button>
                    <button 
                      onClick={() => updateConfigProperty('showDescriptions', !state.config.showDescriptions)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest ${state.config.showDescriptions ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-white/5 opacity-30'}`}
                    >
                      <span>Exibir Descrições</span>
                      {state.config.showDescriptions ? <LucideIcons.CheckCircle2 size={14}/> : <LucideIcons.Circle size={14}/>}
                    </button>
                    <button 
                      onClick={() => updateConfigProperty('showCategories', !state.config.showCategories)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all text-[9px] font-black uppercase tracking-widest ${state.config.showCategories ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-white/5 opacity-30'}`}
                    >
                      <span>Exibir Grupos</span>
                      {state.config.showCategories ? <LucideIcons.CheckCircle2 size={14}/> : <LucideIcons.Circle size={14}/>}
                    </button>
                  </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-8 border border-white/5">
                  <h3 className="text-[10px] font-black mb-6 uppercase text-emerald-400 tracking-[0.5em]">Identidade Visual</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[8px] font-black uppercase opacity-20 ml-2 block mb-3">Temas Rápidos</label>
                      <div className="grid grid-cols-2 gap-2">
                        {THEME_PRESETS.map(preset => (
                          <button key={preset.id} onClick={() => setState({ ...state, theme: { ...preset, accent: preset.isFixed ? preset.accent : rosterColor, backgroundImage: state.theme.backgroundImage } })} className={`p-3 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest ${state.theme.id === preset.id ? 'border-white bg-white/10' : 'border-white/5 opacity-40 hover:opacity-100'}`} style={{ color: preset.isFixed ? preset.accent : rosterColor }}>{preset.name}</button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-4">
                      <div>
                        <label className="text-[8px] font-black uppercase opacity-20 ml-2 block mb-1.5">Efeito de Ambiente</label>
                        <select 
                          value={state.theme.particles} 
                          onChange={(e) => updateThemeProperty('particles', e.target.value as ParticleType)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase outline-none focus:border-white/30"
                        >
                          <option value={ParticleType.NONE} className="bg-slate-900 text-white">Nenhum (Desabilitado)</option>
                          <option value={ParticleType.DIGITAL} className="bg-slate-900 text-white">Digital (Matriz)</option>
                          <option value={ParticleType.SPARKS} className="bg-slate-900 text-white">Faíscas</option>
                          <option value={ParticleType.SNOW} className="bg-slate-900 text-white">Neve</option>
                          <option value={ParticleType.FIRE} className="bg-slate-900 text-white">Fogo</option>
                          <option value={ParticleType.RAIN} className="bg-slate-900 text-white">Chuva</option>
                          <option value={ParticleType.BUBBLES} className="bg-slate-900 text-white">Bolhas</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase opacity-20 ml-2 block mb-1.5">Blur Geral ({state.theme.blurAmount || 0}px)</label>
                        <input type="range" min="0" max="40" step="1" value={state.theme.blurAmount || 0} onChange={(e) => updateThemeProperty('blurAmount', parseInt(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"/>
                      </div>
                      <div>
                        <label className="text-[8px] font-black uppercase opacity-20 ml-2 block mb-1.5">Transparência dos Cards ({Math.round(state.theme.cardOpacity * 100)}%)</label>
                        <input type="range" min="0" max="1" step="0.01" value={state.theme.cardOpacity} onChange={(e) => updateThemeProperty('cardOpacity', parseFloat(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[8px] font-black uppercase opacity-20 ml-2 block mb-1.5">Acento</label>
                          <input type="color" value={state.theme.accent} onChange={(e) => updateThemeProperty('accent', e.target.value)} className="w-full h-10 bg-transparent border-0 cursor-pointer p-0"/>
                        </div>
                        <div>
                          <label className="text-[8px] font-black uppercase opacity-20 ml-2 block mb-1.5">Fundo</label>
                          <input type="color" value={state.theme.background} onChange={(e) => updateThemeProperty('background', e.target.value)} className="w-full h-10 bg-transparent border-0 cursor-pointer p-0"/>
                        </div>
                      </div>
                      <button onClick={() => updateThemeProperty('isFixed', !state.theme.isFixed)} className={`w-full py-2.5 rounded-lg border transition-all text-[8px] font-black uppercase tracking-widest ${state.theme.isFixed ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white/5 border-white/10 opacity-30'}`}>
                        {state.theme.isFixed ? 'Cor Fixa Ativada' : 'Seguir Protocolo Prontidão'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-8 border border-white/5">
                  <h3 className="text-[10px] font-black mb-6 uppercase text-blue-400 tracking-[0.5em]">Textos & Créditos</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[8px] font-black uppercase opacity-20 ml-2 block mb-1.5">Título do Hub</label>
                      <input value={state.config.title} onChange={(e) => updateConfigProperty('title', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] font-bold outline-none focus:border-white/30"/>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase opacity-20 ml-2 block mb-1.5">Slogan / Subtítulo</label>
                      <input value={state.config.subtitle} onChange={(e) => updateConfigProperty('subtitle', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] outline-none focus:border-white/30"/>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase opacity-20 ml-2 block mb-1.5">Créditos / Desenvolvedor</label>
                      <input value={state.config.credits} onChange={(e) => updateConfigProperty('credits', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[10px] outline-none focus:border-white/30" placeholder="Nome do autor..."/>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-8 border border-white/5">
                  <h3 className="text-[10px] font-black mb-6 uppercase text-red-400 tracking-[0.5em]">Segurança</h3>
                  <div className="space-y-3">
                    <button onClick={handleForceSync} disabled={isSyncing} className="w-full py-4 bg-blue-500/10 text-blue-400 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 border border-blue-500/20 active:scale-95 transition-all">{isSyncing ? <LucideIcons.RefreshCw className="animate-spin" size={14}/> : <LucideIcons.Database size={14}/>} Sincronização Forçada</button>
                    <button onClick={clearAllData} className="w-full py-4 bg-red-500/10 text-red-400 rounded-xl font-black uppercase text-[9px] tracking-widest border border-red-500/20 active:scale-95 transition-all">Limpar Cache Local</button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-20 flex justify-center pb-8">
              <button onClick={() => { setIsAdmin(false); setShowAdminPanel(false); }} className="px-20 py-6 bg-white/5 border border-white/10 rounded-[3rem] font-black uppercase tracking-[0.8em] text-[10px] active:scale-95 shadow-2xl hover:bg-red-500/10 hover:text-red-400 transition-all">Encerrar Gerenciamento</button>
            </div>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-6">
          <div className="glass-card rounded-[4rem] p-16 max-w-lg w-full text-center border-t-[10px] shadow-2xl" style={{ borderTopColor: currentAccent }}>
            <h2 className="text-3xl font-black uppercase tracking-tighter mb-4">Autenticação</h2>
            <p className="text-[10px] opacity-30 uppercase tracking-[0.5em] mb-12">Acesso Restrito ao Gerenciamento</p>
            <input type="password" placeholder="••••••" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') handleAdminLogin(e.currentTarget.value); }} className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-8 px-10 mb-10 outline-none text-center text-4xl font-mono tracking-[0.6em] focus:border-white/40"/>
            <div className="flex gap-4">
              <button onClick={() => setShowAdminLogin(false)} className="flex-1 py-6 opacity-40 font-black text-[10px] uppercase tracking-widest">Cancelar</button>
              <button onClick={() => { const input = document.querySelector('input[type="password"]') as HTMLInputElement; handleAdminLogin(input.value); }} className="flex-1 py-6 rounded-[2rem] font-black text-[12px] uppercase tracking-widest text-white shadow-2xl" style={{ backgroundColor: currentAccent }}>Entrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

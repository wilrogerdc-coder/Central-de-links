
import { AppState, LayoutType } from '../types';
import { INITIAL_LINKS, DEFAULT_THEME, INITIAL_CONFIG } from '../constants';

const STORAGE_KEYS = {
  LINKS: 'hub_links',
  THEME: 'hub_theme',
  CONFIG: 'hub_config',
  LAYOUT: 'hub_layout'
};

const getCleanUrl = (baseUrl: string): string => {
  try {
    const url = new URL(baseUrl);
    return url.origin + url.pathname;
  } catch (e) {
    return baseUrl;
  }
};

/**
 * Carrega o estado da aplicação.
 * Prioriza estritamente os dados remotos ou o cache local vazio se nenhum dado existir.
 */
export const loadState = async (forceRemote: boolean = true): Promise<AppState> => {
  const rawUrl = INITIAL_CONFIG.gasUrl;

  if (forceRemote && rawUrl) {
    try {
      const cleanUrl = getCleanUrl(rawUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const params = new URLSearchParams({
        action: 'getData',
        t: Date.now().toString()
      });

      const response = await fetch(`${cleanUrl}?${params.toString()}`, { 
        signal: controller.signal,
        method: 'GET',
        mode: 'cors',
        headers: { 
          'Accept': 'application/json'
        },
        redirect: 'follow'
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const remoteData = await response.json();
        if (remoteData && typeof remoteData === 'object') {
          console.log("📡 [DATABASE] Conexão com banco de dados estabelecida. Dados recuperados.");
          return {
            ...remoteData,
            links: Array.isArray(remoteData.links) ? remoteData.links : [],
            config: { 
              ...INITIAL_CONFIG, 
              ...(remoteData.config || {}), 
              gasUrl: INITIAL_CONFIG.gasUrl 
            }
          } as AppState;
        }
      }
    } catch (e: any) {
      console.warn("📡 [DATABASE] Banco de dados indisponível no momento. Utilizando cache local.", e.message);
    }
  }

  const getLocal = (key: string, def: any) => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : def;
    } catch { return def; }
  };

  return {
    links: getLocal(STORAGE_KEYS.LINKS, INITIAL_LINKS),
    theme: getLocal(STORAGE_KEYS.THEME, DEFAULT_THEME),
    config: getLocal(STORAGE_KEYS.CONFIG, INITIAL_CONFIG),
    layout: (localStorage.getItem(STORAGE_KEYS.LAYOUT) as LayoutType) || LayoutType.GRID
  };
};

export const saveStateLocally = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(state.links));
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(state.theme));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(state.config));
    localStorage.setItem(STORAGE_KEYS.LAYOUT, state.layout);
  } catch (e) {
    console.error("⚠️ [CACHE] Erro ao gravar localmente:", e);
  }
};

/**
 * Persiste os dados no Google Apps Script.
 * Garante que o objeto enviado contenha a estrutura completa esperada pela planilha.
 */
export const syncRemote = async (state: AppState): Promise<boolean> => {
  const rawUrl = state.config.gasUrl || INITIAL_CONFIG.gasUrl;
  if (!rawUrl) return false;
  
  try {
    const cleanUrl = getCleanUrl(rawUrl);
    console.log("📤 [SYNC] Persistindo alterações na planilha remota...");
    
    // O payload deve ser uma string JSON enviada como texto puro para evitar CORS preflight do GAS.
    const payload = JSON.stringify({ 
      action: 'saveData', 
      data: {
        links: state.links,
        theme: state.theme,
        config: state.config,
        layout: state.layout
      }
    });

    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors', 
      body: payload,
      headers: { 
        'Content-Type': 'text/plain;charset=utf-8' 
      },
    });
    
    console.log("✅ [SYNC] Gravação concluída com sucesso.");
    return true;
  } catch (e) {
    console.error("❌ [SYNC] Erro ao gravar no banco de dados:", e);
    return false;
  }
};

export const clearAllData = async () => {
  if (confirm("⚠️ LIMPEZA DEFINITIVA: Deseja apagar todos os dados configurados e resetar o sistema?")) {
    localStorage.clear();
    window.location.reload();
  }
};

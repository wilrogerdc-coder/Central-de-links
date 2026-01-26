
import { AppConfig, AppTheme, LinkItem, ParticleType, LayoutType } from './types';

export const INITIAL_LINKS: LinkItem[] = [];

export const THEME_PRESETS: AppTheme[] = [
  {
    id: 'readiness',
    name: 'Protocolo Prontidão',
    background: '#020617',
    accent: '#3b82f6',
    secondary: '#1e293b',
    cardOpacity: 0.12,
    particles: ParticleType.DIGITAL,
    isFixed: false,
    blurAmount: 20
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    background: '#010501',
    accent: '#10b981',
    secondary: '#064e3b',
    cardOpacity: 0.1,
    particles: ParticleType.DIGITAL,
    isFixed: true,
    blurAmount: 15
  },
  {
    id: 'crimson-protocol',
    name: 'Crimson Protocol',
    background: '#0a0000',
    accent: '#ef4444',
    secondary: '#450a0a',
    cardOpacity: 0.15,
    particles: ParticleType.SPARKS,
    isFixed: true,
    blurAmount: 10
  },
  {
    id: 'indigo-deep',
    name: 'Indigo Deep',
    background: '#030014',
    accent: '#6366f1',
    secondary: '#1e1b4b',
    cardOpacity: 0.1,
    particles: ParticleType.BUBBLES,
    isFixed: true,
    blurAmount: 25
  },
  {
    id: 'amber-alert',
    name: 'Amber Alert',
    background: '#0f0a00',
    accent: '#f59e0b',
    secondary: '#451a03',
    cardOpacity: 0.12,
    particles: ParticleType.FIRE,
    isFixed: true,
    blurAmount: 18
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    background: '#050505',
    accent: '#ff00ff',
    secondary: '#00ffff',
    cardOpacity: 0.15,
    particles: ParticleType.DIGITAL,
    isFixed: true,
    blurAmount: 20
  },
  {
    id: 'obsidian',
    name: 'Obsidian Tech',
    background: '#0a0a0a',
    accent: '#ffffff',
    secondary: '#404040',
    cardOpacity: 0.08,
    particles: ParticleType.DIGITAL,
    isFixed: true,
    blurAmount: 25
  },
  {
    id: 'frost',
    name: 'Frost Byte',
    background: '#f0f9ff',
    accent: '#0ea5e9',
    secondary: '#ffffff',
    cardOpacity: 0.4,
    particles: ParticleType.SNOW,
    isFixed: true,
    blurAmount: 30
  }
];

export const DEFAULT_THEME: AppTheme = THEME_PRESETS[0];

export const INITIAL_CONFIG: AppConfig = {
  title: 'LinkHub Pro',
  subtitle: 'Terminal de Comando Integrado',
  version: '3.3.0',
  credits: 'Desenvolvido por Intelligence Unit',
  gasUrl: 'https://script.google.com/macros/s/AKfycby7dlbNYzLKVBNrmfdmB87yZFa1pJwPC2K_dFhFmwkF3dKKGUoG8FycErIwsdb_huk5/exec',
  showIcons: true,
  showDescriptions: true,
  showCategories: true,
  showSearch: true,
  showPreviews: true,
  adminPasswordHash: '123456'
};

export const ROSTER_COLORS = {
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6'
};

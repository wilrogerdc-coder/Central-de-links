
export enum ParticleType {
  NONE = 'none',
  FIRE = 'fire',
  SPARKS = 'sparks',
  SNOW = 'snow',
  RAIN = 'rain',
  DIGITAL = 'digital',
  BUBBLES = 'bubbles'
}

export enum LayoutType {
  GRID = 'grid',
  COMPACT = 'compact',
  LIST = 'list'
}

export enum RosterStatus {
  GREEN = 'green',
  YELLOW = 'yellow',
  BLUE = 'blue'
}

export interface AppTheme {
  id: string;
  name: string;
  background: string;
  accent: string;
  secondary?: string;
  cardOpacity: number;
  particles: ParticleType;
  backgroundImage?: string;
  isFixed: boolean;
  blurAmount?: number;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  icon: string;
  order: number;
}

export interface AppConfig {
  title: string;
  subtitle: string;
  version: string;
  credits: string;
  gasUrl: string;
  showIcons: boolean;
  showDescriptions: boolean;
  showCategories: boolean;
  showSearch: boolean;
  showPreviews: boolean;
  adminPasswordHash: string;
}

export interface AppState {
  links: LinkItem[];
  theme: AppTheme;
  config: AppConfig;
  layout: LayoutType;
}

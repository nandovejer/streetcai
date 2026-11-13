// Datos de juego: constantes, luchadores y frame data. Sin dependencias de render.
export const VW = 640;
export const VH = 360;
export const STAGE_W = 720;
export const GROUND_Y = 344;
export const GRAVITY = 0.62;
export const SPRITE_SCALE = 1.1;
export const ROUND_TIME = 99;
export const ROUNDS_TO_WIN = 2;

export type MoveId = 'lp' | 'hp' | 'lk' | 'hk' | 'jk' | 'special';

/** Caja relativa al luchador: x = distancia hacia delante, y = altura sobre el suelo. */
export interface Box { x: number; y: number; w: number; h: number }

export interface MoveData {
  id: MoveId;
  anim: 'punch' | 'kick' | 'jumpkick';
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  blockstun: number;
  push: number;
  hitbox: Box;
  /** Nivel para cancelar en combo: solo se cancela a un nivel superior. */
  level: number;
  knockdown?: boolean;
  lunge?: number;
  heavy?: boolean;
  kick?: boolean;
  projectile?: boolean;
  /** Frames de animación por fase (startup / active / recovery). */
  timeline: { s: number[]; a: number[]; r: number[] };
}

const BASE_MOVES: Record<MoveId, MoveData> = {
  lp: {
    id: 'lp', anim: 'punch', startup: 4, active: 3, recovery: 7, damage: 5, hitstun: 15, blockstun: 9, push: 3.2,
    hitbox: { x: 8, y: 92, w: 62, h: 26 }, level: 1, timeline: { s: [0, 2], a: [1], r: [2, 5] },
  },
  lk: {
    id: 'lk', anim: 'kick', startup: 6, active: 4, recovery: 9, damage: 7, hitstun: 17, blockstun: 10, push: 4,
    hitbox: { x: 8, y: 66, w: 74, h: 44 }, level: 2, kick: true, timeline: { s: [0, 1], a: [2], r: [4, 5] },
  },
  hp: {
    id: 'hp', anim: 'punch', startup: 8, active: 4, recovery: 15, damage: 10, hitstun: 21, blockstun: 13, push: 5.5,
    hitbox: { x: 8, y: 88, w: 68, h: 32 }, level: 3, heavy: true, lunge: 2.4, timeline: { s: [0, 0, 2], a: [3], r: [4, 4, 2, 5] },
  },
  hk: {
    id: 'hk', anim: 'kick', startup: 10, active: 5, recovery: 18, damage: 12, hitstun: 22, blockstun: 15, push: 6,
    hitbox: { x: 8, y: 78, w: 82, h: 62 }, level: 4, heavy: true, kick: true, knockdown: true,
    timeline: { s: [0, 1, 2], a: [3], r: [3, 4, 5] },
  },
  jk: {
    id: 'jk', anim: 'jumpkick', startup: 4, active: 16, recovery: 60, damage: 10, hitstun: 19, blockstun: 12, push: 4.5,
    hitbox: { x: -6, y: -8, w: 70, h: 52 }, level: 9, heavy: true, kick: true, timeline: { s: [2], a: [3], r: [4] },
  },
  special: {
    id: 'special', anim: 'punch', startup: 13, active: 2, recovery: 24, damage: 12, hitstun: 20, blockstun: 13, push: 5,
    hitbox: { x: 0, y: 0, w: 0, h: 0 }, level: 5, heavy: true, projectile: true,
    timeline: { s: [0, 0, 2, 2], a: [1], r: [3, 4, 4, 2, 5] },
  },
};

/** Luchadores disponibles, en el orden en que aparecen en la selección. */
export const FIGHTER_IDS = ['chapa', 'ares', 'alba', 'martin', 'selu'] as const;
export type FighterId = (typeof FIGHTER_IDS)[number];

/** Escenario del barrio de cada luchador (el suyo en el mapa de la selección). */
export const HOME_STAGE: Record<FighterId, StageId> = { chapa: 'candelaria', ares: 'santamaria', alba: 'caleta', martin: 'falla', selu: 'plaza' };

export interface FighterDef {
  id: FighterId;
  name: string;
  title: string;
  maxHp: number;
  walk: number;
  jumpV: number;
  jumpVx: number;
  power: number;
  specialName: string;
  proj: { speed: number; damage: number; core: string; glow: string; size: number };
  stats: { fuerza: number; velocidad: number; tecnica: number; aguante: number };
  moves: Record<MoveId, MoveData>;
}

function scaleMoves(frameMult: number, reach: number): Record<MoveId, MoveData> {
  const out = {} as Record<MoveId, MoveData>;
  (Object.keys(BASE_MOVES) as MoveId[]).forEach((k) => {
    const m = BASE_MOVES[k];
    out[k] = {
      ...m,
      startup: Math.max(2, Math.round(m.startup * frameMult)),
      recovery: Math.max(2, Math.round(m.recovery * frameMult)),
      hitbox: { ...m.hitbox, w: Math.round(m.hitbox.w * reach) },
    };
  });
  return out;
}

export const FIGHTERS: Record<FighterId, FighterDef> = {
  chapa: {
    id: 'chapa', name: 'CHAPA', title: 'EL GUERRERO', maxHp: 150, walk: 2.0, jumpV: 10.6, jumpVx: 2.5, power: 1.06,
    specialName: 'CHAPAZO', proj: { speed: 4.2, damage: 12, core: '#ffe9a0', glow: '#ff7a1a', size: 17 },
    stats: { fuerza: 4, velocidad: 2, tecnica: 3, aguante: 5 }, moves: scaleMoves(1.2, 1.0),
  },
  ares: {
    id: 'ares', name: 'ARES', title: 'EL VIAJERO', maxHp: 140, walk: 2.7, jumpV: 11.2, jumpVx: 3.1, power: 1.0,
    specialName: 'LEVANTERA', proj: { speed: 6.2, damage: 10, core: '#e6fff9', glow: '#19c7b0', size: 13 },
    stats: { fuerza: 3, velocidad: 4, tecnica: 5, aguante: 3 }, moves: scaleMoves(0.88, 1.0),
  },
  // Boxeador veterano: lento pero muy duro de tumbar, golpes cortos y pesados.
  alba: {
    id: 'alba', name: 'ALBA', title: 'EL MARINERO', maxHp: 150, walk: 2.1, jumpV: 10.2, jumpVx: 2.4, power: 1.08,
    specialName: 'MAREJADA', proj: { speed: 4.8, damage: 12, core: '#eaf7ff', glow: '#2f7de0', size: 15 },
    stats: { fuerza: 3, velocidad: 2, tecnica: 3, aguante: 4 }, moves: scaleMoves(1.1, 0.94),
  },
  // Luchador callejero experimentado: equilibrado y rápido de piernas.
  martin: {
    id: 'martin', name: 'MARTIN', title: 'EL VETERANO', maxHp: 136, walk: 2.5, jumpV: 10.9, jumpVx: 2.9, power: 1.0,
    specialName: 'SOMBRERAZO', proj: { speed: 5.4, damage: 11, core: '#ffe9b8', glow: '#b06a2a', size: 14 },
    stats: { fuerza: 3, velocidad: 4, tecnica: 4, aguante: 4 }, moves: scaleMoves(0.95, 1.0),
  },
  // Dúo de carnaval: improvisación a dos, técnico y con algo más de alcance.
  selu: {
    id: 'selu', name: 'SELU', title: 'EL DUO', maxHp: 140, walk: 2.4, jumpV: 10.6, jumpVx: 2.7, power: 1.0,
    specialName: 'CHIRIGOTA', proj: { speed: 5.0, damage: 11, core: '#fff0ff', glow: '#b040ff', size: 15 },
    stats: { fuerza: 3, velocidad: 3, tecnica: 4, aguante: 3 }, moves: scaleMoves(1.0, 1.06),
  },
};

/** Escenarios: imagen en public/assets/stages/<id>/bg.webp. */
export const STAGE_IDS = ['plaza', 'caleta', 'candelaria', 'falla', 'santamaria'] as const;
export type StageId = (typeof STAGE_IDS)[number];
export const STAGES: Record<StageId, { name: string; ambient: 'petals' | 'gulls' }> = {
  plaza: { name: 'PLAZA DE LAS FLORES', ambient: 'petals' },
  caleta: { name: 'LA CALETA', ambient: 'gulls' },
  candelaria: { name: 'PLAZA DE LA CANDELARIA', ambient: 'petals' },
  falla: { name: 'TEATRO FALLA', ambient: 'petals' },
  santamaria: { name: 'BARRIO DE SANTA MARIA', ambient: 'petals' },
};

export type Difficulty = 0 | 1 | 2;
export const DIFFICULTY_NAMES = ['FACIL', 'NORMAL', 'DIFICIL'];

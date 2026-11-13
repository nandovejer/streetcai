// Carga de recursos gráficos (atlas por luchador, retratos y escenarios).
import { STAGE_IDS, StageId } from '../game/data';
export interface AtlasFrame { x: number; y: number; w: number; h: number; ax: number; s: number }
export interface Atlas { img: HTMLImageElement; frames: Record<string, AtlasFrame>; anims: Record<string, string[]> }
export interface Assets {
  atlas: Record<string, Atlas>;
  portrait: Record<string, HTMLImageElement>;
  /** Retrato de derrota para la pantalla de CONTINUE. */
  defeated: Record<string, HTMLImageElement>;
  stages: Record<StageId, HTMLImageElement>;
  /** Mapa de Cádiz de la pantalla de selección. */
  map: HTMLImageElement;
}

const base = import.meta.env.BASE_URL;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('No se pudo cargar ' + src));
    i.src = src;
  });
}

export async function loadAssets(ids: string[]): Promise<Assets> {
  const out: Assets = { atlas: {}, portrait: {}, defeated: {}, stages: {} as Record<StageId, HTMLImageElement>, map: await loadImage(`${base}assets/ui/map-cadiz.webp`) };
  await Promise.all(STAGE_IDS.map(async (sid) => { out.stages[sid] = await loadImage(`${base}assets/stages/${sid}/bg.webp`); }));
  await Promise.all(ids.map(async (id) => {
    const dir = `${base}assets/fighters/${id}/`;
    const [img, meta, portrait, defeated] = await Promise.all([
      loadImage(dir + 'atlas.png'),
      fetch(dir + 'atlas.json').then((r) => r.json()),
      loadImage(dir + 'portrait.png'),
      loadImage(dir + 'defeated.webp'),
    ]);
    out.atlas[id] = { img, frames: meta.frames, anims: meta.anims };
    out.portrait[id] = portrait;
    out.defeated[id] = defeated;
  }));
  return out;
}

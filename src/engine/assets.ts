// Carga de recursos gráficos (atlas por luchador, retratos y escenario).
export interface AtlasFrame { x: number; y: number; w: number; h: number; ax: number; s: number }
export interface Atlas { img: HTMLImageElement; frames: Record<string, AtlasFrame>; anims: Record<string, string[]> }
export interface Assets {
  atlas: Record<string, Atlas>;
  portrait: Record<string, HTMLImageElement>;
  bg: HTMLImageElement;
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
  const out: Assets = { atlas: {}, portrait: {}, bg: await loadImage(`${base}assets/stages/plaza/bg.webp`) };
  await Promise.all(ids.map(async (id) => {
    const dir = `${base}assets/fighters/${id}/`;
    const [img, meta, portrait] = await Promise.all([
      loadImage(dir + 'atlas.png'),
      fetch(dir + 'atlas.json').then((r) => r.json()),
      loadImage(dir + 'portrait.png'),
    ]);
    out.atlas[id] = { img, frames: meta.frames, anims: meta.anims };
    out.portrait[id] = portrait;
  }));
  return out;
}

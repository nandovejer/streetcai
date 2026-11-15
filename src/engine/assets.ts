// Carga de recursos gráficos. Al arrancar solo se descarga el fondo de la portada; lo demás llega en segundo
// plano por orden de uso (mapa y retratos, luchadores, escenarios, caras de derrota) o bajo demanda con ensure*.
import { FIGHTER_IDS, STAGE_IDS, StageId } from '../game/data';
export interface AtlasFrame { x: number; y: number; w: number; h: number; ax: number; s: number }
export interface Atlas { img: HTMLImageElement; frames: Record<string, AtlasFrame>; anims: Record<string, string[]> }

const base = import.meta.env.BASE_URL;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => {
      // decodificar ya, para que el primer dibujo no pare el bucle
      // (con un límite: si un navegador no resuelve decode(), la imagen se usa igualmente)
      if (i.decode) Promise.race([i.decode(), new Promise((ok) => setTimeout(ok, 3000))]).then(() => res(i), () => res(i)); else res(i);
    };
    i.onerror = () => rej(new Error('No se pudo cargar ' + src));
    i.src = src;
  });
}

export class Assets {
  /** Todo lo que no es la portada puede no estar todavía: comprobar antes de usar. */
  atlas: Record<string, Atlas | undefined> = {};
  portrait: Record<string, HTMLImageElement | undefined> = {};
  /** Retrato de derrota para la pantalla de CONTINUE. */
  defeated: Record<string, HTMLImageElement | undefined> = {};
  stages: Partial<Record<StageId, HTMLImageElement>> = {};
  /** Mapa de Cádiz de la pantalla de selección. */
  map: HTMLImageElement | null = null;
  /** Fondo de la portada (Puerta de Tierra). */
  title!: HTMLImageElement;

  private jobs = new Map<string, Promise<void>>();
  /** Una sola descarga por recurso; si falla se olvida para poder reintentar. */
  private job(key: string, fn: () => Promise<void>): Promise<void> {
    let p = this.jobs.get(key);
    if (!p) {
      p = fn().catch((e) => { this.jobs.delete(key); console.warn(e); });
      this.jobs.set(key, p);
    }
    return p;
  }

  ensureMap() { return this.job('map', async () => { this.map = await loadImage(`${base}assets/ui/map-cadiz.webp`); }); }
  ensurePortrait(id: string) { return this.job('p:' + id, async () => { this.portrait[id] = await loadImage(`${base}assets/fighters/${id}/portrait.webp`); }); }
  ensureDefeated(id: string) { return this.job('d:' + id, async () => { this.defeated[id] = await loadImage(`${base}assets/fighters/${id}/defeated.webp`); }); }
  ensureStage(sid: StageId) { return this.job('s:' + sid, async () => { this.stages[sid] = await loadImage(`${base}assets/stages/${sid}/bg.webp`); }); }
  ensureFighter(id: string) {
    return this.job('f:' + id, async () => {
      const dir = `${base}assets/fighters/${id}/`;
      const [img, meta] = await Promise.all([loadImage(dir + 'atlas.png'), fetch(dir + 'atlas.json').then((r) => r.json())]);
      this.atlas[id] = { img, frames: meta.frames, anims: meta.anims };
    });
  }

  hasFighter(id: string) { return !!this.atlas[id]; }
  /** ¿Está todo lo necesario para pelear? */
  fightReady(ids: string[], stage: StageId) { return ids.every((id) => !!this.atlas[id]) && !!this.stages[stage]; }
  /** Pide (sin esperar) lo necesario para pelear; devuelve cuando llegue. */
  needFight(ids: string[], stage: StageId) {
    return Promise.all([...ids.map((id) => this.ensurePortrait(id)), ...ids.map((id) => this.ensureFighter(id)), ...ids.map((id) => this.ensureDefeated(id)), this.ensureStage(stage)]);
  }

  /** Descarga en segundo plano, de dos en dos para no ahogar lo que se pida bajo demanda. */
  async warm(firstFighters: string[] = []) {
    const queue: (() => Promise<void>)[] = [() => this.ensureMap()];
    for (const id of FIGHTER_IDS) queue.push(() => this.ensurePortrait(id));
    const fighters = [...new Set([...firstFighters, ...FIGHTER_IDS])];
    for (const id of fighters) queue.push(() => this.ensureFighter(id));
    for (const sid of STAGE_IDS) queue.push(() => this.ensureStage(sid));
    for (const id of FIGHTER_IDS) queue.push(() => this.ensureDefeated(id));
    const worker = async () => { for (let f = queue.shift(); f; f = queue.shift()) await f(); };
    await Promise.all([worker(), worker()]);
  }

  /** Todo de golpe (parámetros de prueba). */
  async all() {
    await Promise.all([this.ensureMap(), ...FIGHTER_IDS.flatMap((id) => [this.ensurePortrait(id), this.ensureFighter(id), this.ensureDefeated(id)]), ...STAGE_IDS.map((s) => this.ensureStage(s))]);
  }
}

export async function loadAssets(): Promise<Assets> {
  const a = new Assets();
  a.title = await loadImage(`${base}assets/ui/title-bg.webp`);
  return a;
}

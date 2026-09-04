export type RecordEntry = { heroId: string; name: string; capital: number; stage: number; seed: string; date: string };
export type SaveData = { heroId: string; names: Record<string, string>; sound: boolean; records: RecordEntry[]; bests: Record<string, number> };
const KEY = 'patsany-v-aktive:v1';
const defaults = (): SaveData => ({ heroId: 'left', names: {}, sound: true, records: [], bests: {} });
export class Saves {
  data = defaults();
  unavailable = false;
  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const value = JSON.parse(raw);
        if (typeof value.heroId === 'string') this.data.heroId = value.heroId;
        if (typeof value.sound === 'boolean') this.data.sound = value.sound;
        for (const id of ['left', 'back', 'center', 'right']) {
          if (Number.isFinite(value.bests?.[id]) && value.bests[id] >= 0) this.data.bests[id] = Math.floor(value.bests[id]);
        }
        if (value.names && typeof value.names === 'object') {
          for (const id of ['left', 'back', 'center', 'right']) {
            if (typeof value.names[id] === 'string') this.data.names[id] = cleanName(value.names[id]);
          }
        }
        if (Array.isArray(value.records)) this.data.records = value.records.filter((r: RecordEntry) =>
          r && typeof r.heroId === 'string' && typeof r.name === 'string' && Number.isFinite(r.capital) && r.capital >= 0 &&
          Number.isInteger(r.stage) && r.stage >= 0 && r.stage <= 4 && typeof r.seed === 'string' && typeof r.date === 'string'
        ).slice(0, 10).map((r: RecordEntry) => ({ ...r, name: cleanName(r.name) }));
      }
      for (const record of this.data.records) this.data.bests[record.heroId] = Math.max(this.data.bests[record.heroId] || 0, record.capital);
      this.persist();
    } catch { this.unavailable = true; }
  }
  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); }
    catch { this.unavailable = true; }
  }
  record(entry: RecordEntry) {
    this.data.bests[entry.heroId] = Math.max(this.best(entry.heroId), Math.floor(entry.capital));
    this.data.records = [...this.data.records, entry].sort((a, b) => b.capital - a.capital).slice(0, 10);
    this.persist();
  }
  best(heroId: string) { return Math.max(this.data.bests[heroId] || 0, ...this.data.records.filter(r => r.heroId === heroId).map(r => r.capital)); }
}
export const cleanName = (name: string) => name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 20);

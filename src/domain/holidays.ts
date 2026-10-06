// Festivos de Colombia (Ley 51 de 1983, "Ley Emiliani"). Las fechas trabajan
// como "yyyy-mm-dd" en hora de Colombia.

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Domingo de Pascua (algoritmo anónimo gregoriano). */
export function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

/** Traslada al lunes siguiente si no cae en lunes. */
function nextMonday(d: Date) {
  const dow = d.getUTCDay();
  return dow === 1 ? d : addDays(d, (8 - dow) % 7);
}

const cache = new Map<number, Set<string>>();

export function colombianHolidays(year: number): Set<string> {
  const hit = cache.get(year);
  if (hit) return hit;
  const easter = easterSunday(year);
  const fixed = [utc(year, 1, 1), utc(year, 5, 1), utc(year, 7, 20), utc(year, 8, 7), utc(year, 12, 8), utc(year, 12, 25)];
  const moved = [
    utc(year, 1, 6), utc(year, 3, 19), utc(year, 6, 29), utc(year, 8, 15),
    utc(year, 10, 12), utc(year, 11, 1), utc(year, 11, 11),
    addDays(easter, 39), // Ascensión
    addDays(easter, 60), // Corpus Christi
    addDays(easter, 68), // Sagrado Corazón
  ].map(nextMonday);
  const holyWeek = [addDays(easter, -3), addDays(easter, -2)]; // Jueves y Viernes Santo
  const set = new Set([...fixed, ...moved, ...holyWeek].map(iso));
  cache.set(year, set);
  return set;
}

export function isHoliday(isoDate: string) {
  return colombianHolidays(Number(isoDate.slice(0, 4))).has(isoDate);
}

export function isBusinessDay(isoDate: string) {
  const dow = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6 && !isHoliday(isoDate);
}

/** Suma n días hábiles a una fecha (sin contar la fecha inicial). */
export function addBusinessDays(isoDate: string, n: number) {
  let d = new Date(`${isoDate}T12:00:00Z`);
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    if (isBusinessDay(iso(d))) left--;
  }
  return iso(d);
}

/** Fecha de hoy en Colombia (UTC-5, sin horario de verano). */
export function todayInColombia(now = new Date()) {
  return iso(new Date(now.getTime() - 5 * 3_600_000));
}

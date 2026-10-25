import { businessDays, type BusinessDayHours, type BusinessDayKey, type WeeklyOpeningHours } from "@/modules/profile/commercial-profile/types/businessHours";

const unknownDay = (): BusinessDayHours => ({ status: "unknown", opensAt: "", closesAt: "" });

export function emptyWeeklyHours(): WeeklyOpeningHours {
  return Object.fromEntries(businessDays.map(({ key }) => [key, unknownDay()])) as WeeklyOpeningHours;
}

function normalizeDay(value: string): BusinessDayKey | undefined {
  const token = value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.$/, "");
  const aliases: Record<string, BusinessDayKey> = {
    seg: "monday", segunda: "monday", "segunda-feira": "monday",
    ter: "tuesday", terca: "tuesday", "terca-feira": "tuesday",
    qua: "wednesday", quarta: "wednesday", "quarta-feira": "wednesday",
    qui: "thursday", quinta: "thursday", "quinta-feira": "thursday",
    sex: "friday", sexta: "friday", "sexta-feira": "friday",
    sab: "saturday", sabado: "saturday",
    dom: "sunday", domingo: "sunday",
  };
  return aliases[token];
}

function parseTime(value: string): string | undefined {
  const match = value.trim().match(/^(\d{1,2})h(?:(\d{2}))?$/i);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "00");
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseLegacyHours(value: string): WeeklyOpeningHours {
  const result = emptyWeeklyHours();
  const parts = value.split("·").map(part => part.trim()).filter(Boolean);
  let parsedAny = false;
  for (let index = 0; index + 1 < parts.length; index += 2) {
    const [startToken, endToken] = parts[index].split(/\s*[–—-]\s*/);
    const startDay = normalizeDay(startToken ?? "");
    const endDay = normalizeDay(endToken ?? startToken ?? "");
    const [opensToken, closesToken] = parts[index + 1].split(/\s*[–—-]\s*/);
    const opensAt = parseTime(opensToken ?? "");
    const closesAt = parseTime(closesToken ?? "");
    if (!startDay || !endDay || !opensAt || !closesAt) continue;
    const startIndex = businessDays.findIndex(day => day.key === startDay);
    const endIndex = businessDays.findIndex(day => day.key === endDay);
    for (let dayIndex = startIndex; ; dayIndex = (dayIndex + 1) % businessDays.length) {
      const key = businessDays[dayIndex].key;
      result[key] = { status: "open", opensAt, closesAt };
      parsedAny = true;
      if (dayIndex === endIndex) break;
    }
  }
  return parsedAny ? result : emptyWeeklyHours();
}

export function makeWeeklyHours(
  saved?: Partial<WeeklyOpeningHours>,
  legacyText?: string,
): WeeklyOpeningHours {
  if (saved) return { ...emptyWeeklyHours(), ...saved };
  return legacyText ? parseLegacyHours(legacyText) : emptyWeeklyHours();
}

function hoursStatusText(hours: BusinessDayHours) {
  if (hours.status === "closed") return "Fechado";
  if (hours.status === "unknown") return "Não informado";
  return `${hours.opensAt}–${hours.closesAt}`;
}

function sameSchedule(a: BusinessDayHours, b: BusinessDayHours) {
  return a.status === b.status && a.opensAt === b.opensAt && a.closesAt === b.closesAt;
}

function clockLabel(value: string) {
  const [hour, minute] = value.split(":");
  return minute === "00" ? `${hour}h` : `${hour}h${minute}`;
}

export function formatWeeklyHours(hours: WeeklyOpeningHours): string {
  if (businessDays.every(day => hours[day.key].status === "unknown")) return "Horário não informado";
  const groups: string[] = [];
  for (let index = 0; index < businessDays.length;) {
    const first = businessDays[index];
    const value = hours[first.key];
    let end = index;
    while (end + 1 < businessDays.length && sameSchedule(value, hours[businessDays[end + 1].key])) end += 1;
    const dayLabel = end === index
      ? first.short
      : `${first.short}–${businessDays[end].short}`;
    const statusLabel = value.status === "open"
      ? `${clockLabel(value.opensAt)}–${clockLabel(value.closesAt)}`
      : hoursStatusText(value);
    groups.push(`${dayLabel} · ${statusLabel}`);
    index = end + 1;
  }
  return groups.join("  |  ");
}

export function weeklyHoursRows(hours: WeeklyOpeningHours) {
  return businessDays.map(day => ({
    label: day.label,
    value: hoursStatusText(hours[day.key]),
  }));
}

export function hasInvalidOpenHours(hours: WeeklyOpeningHours) {
  return businessDays.some(({ key }) => {
    const day = hours[key];
    return day.status === "open" &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.opensAt) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(day.closesAt) ||
        day.opensAt === day.closesAt);
  });
}

export const businessDays = [
  { key: "monday", label: "Segunda-feira", short: "Seg" },
  { key: "tuesday", label: "Terça-feira", short: "Ter" },
  { key: "wednesday", label: "Quarta-feira", short: "Qua" },
  { key: "thursday", label: "Quinta-feira", short: "Qui" },
  { key: "friday", label: "Sexta-feira", short: "Sex" },
  { key: "saturday", label: "Sábado", short: "Sáb" },
  { key: "sunday", label: "Domingo", short: "Dom" },
] as const;

export type BusinessDayKey = (typeof businessDays)[number]["key"];
export type DayHoursStatus = "open" | "closed" | "unknown";

export interface BusinessDayHours {
  status: DayHoursStatus;
  opensAt: string;
  closesAt: string;
}

export type WeeklyOpeningHours = Record<BusinessDayKey, BusinessDayHours>;

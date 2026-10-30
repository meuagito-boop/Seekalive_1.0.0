export type AccountAgeIneligibilityReason =
  | "invalid_date"
  | "underage"
  | "over_age_limit";

export type AccountAgeEligibility =
  | { kind: "eligible"; age: number }
  | { kind: "ineligible"; reason: AccountAgeIneligibilityReason };

const DATE_OF_BIRTH_PATTERN =
  /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
const AGE_CALENDAR_TIME_ZONE = "America/Sao_Paulo";
const AGE_CALENDAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: AGE_CALENDAR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function getCalendarDate(date: Date) {
  const parts = AGE_CALENDAR_FORMATTER.formatToParts(date);
  const valueFor = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: valueFor("year"),
    month: valueFor("month"),
    day: valueFor("day"),
  };
}

export function assessAccountAge(
  dateOfBirth: string,
  referenceDate = new Date(),
): AccountAgeEligibility {
  const match = DATE_OF_BIRTH_PATTERN.exec(dateOfBirth);
  if (!match || Number.isNaN(referenceDate.getTime())) {
    return { kind: "ineligible", reason: "invalid_date" };
  }

  const [day, month, year] = dateOfBirth.split("/").map(Number);
  if (day > daysInMonth(year, month)) {
    return { kind: "ineligible", reason: "invalid_date" };
  }

  const today = getCalendarDate(referenceDate);
  const isBirthdayInFuture =
    year > today.year ||
    (year === today.year && month > today.month) ||
    (year === today.year && month === today.month && day > today.day);
  if (isBirthdayInFuture) {
    return { kind: "ineligible", reason: "invalid_date" };
  }

  let age = today.year - year;
  if (today.month < month || (today.month === month && today.day < day)) {
    age -= 1;
  }

  if (age < 18) return { kind: "ineligible", reason: "underage" };
  if (age > 120) return { kind: "ineligible", reason: "over_age_limit" };
  return { kind: "eligible", age };
}

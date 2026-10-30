export type AccountAgeIneligibilityReason =
  | "invalid_date"
  | "underage"
  | "over_age_limit";

export type AccountAgeEligibility =
  | { kind: "eligible"; age: number }
  | { kind: "ineligible"; reason: AccountAgeIneligibilityReason };

const DATE_OF_BIRTH_PATTERN =
  /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

function createUtcCalendarDate(year: number, month: number, day: number) {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
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
  const birthDate = createUtcCalendarDate(year, month, day);
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return { kind: "ineligible", reason: "invalid_date" };
  }

  const today = createUtcCalendarDate(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth() + 1,
    referenceDate.getUTCDate(),
  );
  if (birthDate > today) {
    return { kind: "ineligible", reason: "invalid_date" };
  }

  let age = today.getUTCFullYear() - year;
  if (
    today.getUTCMonth() < month - 1 ||
    (today.getUTCMonth() === month - 1 && today.getUTCDate() < day)
  ) {
    age -= 1;
  }

  if (age < 18) return { kind: "ineligible", reason: "underage" };
  if (age > 120) return { kind: "ineligible", reason: "over_age_limit" };
  return { kind: "eligible", age };
}

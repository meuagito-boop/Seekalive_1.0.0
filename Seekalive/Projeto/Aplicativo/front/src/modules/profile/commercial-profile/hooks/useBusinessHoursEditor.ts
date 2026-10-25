import { useState } from "react";
import type {
  BusinessDayHours,
  BusinessDayKey,
  WeeklyOpeningHours,
} from "@/modules/profile/commercial-profile/types/businessHours";
import {
  formatWeeklyHours,
  hasInvalidOpenHours,
  makeWeeklyHours,
} from "@/modules/profile/commercial-profile/utils/businessHours";
import type { User } from "@/modules/profile/types/user";

type CommercialProfile = NonNullable<User["commercialProfile"]>;

export function useBusinessHoursEditor(profile: CommercialProfile | undefined) {
  const [weeklyHours, setWeeklyHours] = useState<WeeklyOpeningHours>(() =>
    makeWeeklyHours(profile?.weeklyHours, profile?.openingHours));
  const [hoursTouched, setHoursTouched] = useState(false);
  const [hoursError, setHoursError] = useState("");

  function updateDayHours(day: BusinessDayKey, changes: Partial<BusinessDayHours>) {
    setHoursTouched(true);
    setHoursError("");
    setWeeklyHours((previous) => ({
      ...previous,
      [day]: { ...previous[day], ...changes },
    }));
  }

  function validate() {
    if (hoursTouched && hasInvalidOpenHours(weeklyHours)) {
      setHoursError("Informe horários válidos para cada dia marcado como aberto.");
      return false;
    }
    return true;
  }

  function getNextValues() {
    const nextWeeklyHours = hoursTouched ? weeklyHours : profile?.weeklyHours;
    const formattedHours = formatWeeklyHours(weeklyHours);
    const openingHours = hoursTouched
      ? formattedHours === "Horário não informado" ? undefined : formattedHours
      : profile?.weeklyHours
        ? formatWeeklyHours(profile.weeklyHours)
        : profile?.openingHours;
    return { weeklyHours: nextWeeklyHours, openingHours };
  }

  return { weeklyHours, hoursError, updateDayHours, validate, getNextValues };
}

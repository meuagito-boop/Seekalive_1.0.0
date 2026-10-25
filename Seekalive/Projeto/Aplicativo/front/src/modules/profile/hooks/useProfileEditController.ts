import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { AccountPatch, MyAccountResponse } from "@workspace/api-client-react";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialContext";
import { myAccountToUser, socialGraphApi } from "@/modules/social/services/socialGraphApi";
import type { DiscoveryLocation } from "@/modules/seek/utils/seekDiscovery";
import { formatWeeklyHours, hasInvalidOpenHours, makeWeeklyHours } from "@/modules/profile/commercial-profile/utils/businessHours";
import type { BusinessDayHours, BusinessDayKey, WeeklyOpeningHours } from "@/modules/profile/commercial-profile/types/businessHours";
import {
  profileEditSchema,
  serviceStatus,
  type ProfileEditFormValues,
} from "@/modules/profile/types/profileEditSchema";
import { normalizeProfileEditUsername } from "@/modules/profile/utils/commonProfileEdit";
import {
  buildPersonalPreviewUser,
  buildPersonalProfilePatch,
  validatePersonalProfileName,
} from "@/modules/profile/personal-profile/utils/personalProfileEdit";
import {
  buildCommercialPreviewUser,
  buildCommercialProfilePatch,
  validateCommercialProfileName,
} from "@/modules/profile/commercial-profile/utils/commercialProfileEdit";

export function useProfileEditController() {
  const [, setLocation] = useLocation();
  const {
    currentUser: signedInUser,
    isAuthenticated,
    isDevelopmentPreview,
    updateAccount,
  } = useAppContext();
  const { addUser } = useSocial();
  const currentUser = signedInUser;
  const isServerAccount = isAuthenticated && !isDevelopmentPreview;
  const profile = currentUser?.commercialProfile;
  const [ownerProfile, setOwnerProfile] = useState<MyAccountResponse | null>(null);
  const [accountLoadError, setAccountLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [discoveryCity, setDiscoveryCity] = useState<DiscoveryLocation | null>(() =>
    profile?.cityId && profile.cityName && profile.cityState
      ? {
          id: profile.cityId,
          city: profile.cityName,
          state: profile.cityState,
          source: "manual",
          label: `${profile.cityName}, ${profile.cityState}`,
        }
      : null);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyOpeningHours>(() =>
    makeWeeklyHours(profile?.weeklyHours, profile?.openingHours));
  const [hoursTouched, setHoursTouched] = useState(false);
  const [hoursError, setHoursError] = useState("");

  const form = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      firstName: currentUser?.firstName ?? currentUser?.displayName.split(/\s+/)[0] ?? "",
      lastName: currentUser?.lastName ?? currentUser?.displayName.split(/\s+/).slice(1).join(" ") ?? "",
      displayName: currentUser?.displayName ?? "",
      username: currentUser?.username ?? "",
      bio: currentUser?.bio ?? "",
      location: currentUser?.location ?? "",
      website: currentUser?.website ?? "",
      businessAddress: currentUser?.commercialProfile?.address ?? "",
      priceLevel: currentUser?.commercialProfile?.priceLevel?.toString() ?? "",
      serviceDelivery: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.delivery),
      serviceDineIn: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.dineIn),
      serviceTableService: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.tableService),
      serviceReservations: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.reservations),
      serviceAppointments: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.appointments),
      serviceTakeout: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.takeout),
    },
  });

  useEffect(() => {
    if (!isServerAccount || !signedInUser) return;
    let active = true;
    setAccountLoadError("");
    socialGraphApi.getMyAccount()
      .then((response) => {
        if (!active) return;
        setOwnerProfile(response);
        const user = myAccountToUser(response);
        updateAccount(user);
        addUser(user);
        const commercial = response.commercialProfile;
        form.reset({
          firstName: response.firstName ?? "",
          lastName: response.lastName ?? "",
          displayName: response.account.displayName,
          username: response.account.username,
          bio: response.account.bio,
          location: response.account.location ?? "",
          website: response.account.website ?? "",
          businessAddress: commercial?.address ?? "",
          priceLevel: currentUser?.commercialProfile?.priceLevel?.toString() ?? "",
          serviceDelivery: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.delivery),
          serviceDineIn: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.dineIn),
          serviceTableService: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.tableService),
          serviceReservations: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.reservations),
          serviceAppointments: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.appointments),
          serviceTakeout: serviceStatus(currentUser?.commercialProfile?.serviceOptions?.takeout),
        });
        if (commercial) {
          setDiscoveryCity({
            id: "",
            city: commercial.cityName,
            state: commercial.stateName,
            source: "manual",
            label: `${commercial.cityName}, ${commercial.stateName}`,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setAccountLoadError(error instanceof Error ? error.message : "Não foi possível carregar os dados da conta.");
        }
      });
    return () => {
      active = false;
    };
  }, [isServerAccount, signedInUser?.id]);

  const publicNameChangeDate = ownerProfile?.publicNameChangeAvailableAt
    ? new Date(ownerProfile.publicNameChangeAvailableAt)
    : null;
  const usernameChangeDate = ownerProfile?.usernameChangeAvailableAt
    ? new Date(ownerProfile.usernameChangeAvailableAt)
    : null;
  const publicNameLocked = isServerAccount && (
    !publicNameChangeDate || publicNameChangeDate.getTime() > Date.now()
  );
  const usernameLocked = isServerAccount && (
    !usernameChangeDate || usernameChangeDate.getTime() > Date.now()
  );
  const formatChangeDate = (value: Date | null) => value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(value)
    : "";

  function updateDayHours(day: BusinessDayKey, changes: Partial<BusinessDayHours>) {
    setHoursTouched(true);
    setHoursError("");
    setWeeklyHours((previous) => ({
      ...previous,
      [day]: { ...previous[day], ...changes },
    }));
  }

  async function onSubmit(values: ProfileEditFormValues) {
    setSaveError("");
    if (currentUser?.accountType === "personal") {
      const invalidName = validatePersonalProfileName(values);
      if (invalidName === "firstName") {
        form.setError("firstName", { type: "validate", message: "Informe seu nome." });
        return;
      }
      if (invalidName === "lastName") {
        form.setError("lastName", { type: "validate", message: "Informe seu sobrenome." });
        return;
      }
    } else if (currentUser?.accountType === "commercial" && !validateCommercialProfileName(values)) {
      form.setError("displayName", { type: "validate", message: "Informe o nome da empresa ou estabelecimento." });
      return;
    }
    if (currentUser?.accountType === "commercial" && hoursTouched && hasInvalidOpenHours(weeklyHours)) {
      setHoursError("Informe horários válidos para cada dia marcado como aberto.");
      return;
    }

    const nextWeeklyHours = hoursTouched ? weeklyHours : profile?.weeklyHours;
    const formattedHours = formatWeeklyHours(weeklyHours);
    const nextOpeningHours = hoursTouched
      ? formattedHours === "Horário não informado" ? undefined : formattedHours
      : profile?.weeklyHours
        ? formatWeeklyHours(profile.weeklyHours)
        : profile?.openingHours;

    if (!currentUser) {
      setSaveError("Entre na sua conta para editar o perfil.");
      return;
    }

    if (isServerAccount) {
      if (!ownerProfile) {
        setSaveError(accountLoadError || "Aguarde o carregamento dos dados da conta antes de salvar.");
        return;
      }
      const nextUsername = normalizeProfileEditUsername(values.username);
      const usernameChanged = nextUsername !== ownerProfile.account.username;
      if (
        usernameChanged
        && !window.confirm(
          "Ao alterar seu @, o anterior ficará indisponível para todas as contas, inclusive você, por 30 dias. Depois desse prazo, outra conta poderá usá-lo. Deseja continuar?",
        )
      ) {
        return;
      }

      const patch: AccountPatch = currentUser.accountType === "personal"
        ? buildPersonalProfilePatch(values, ownerProfile, usernameChanged)
        : buildCommercialProfilePatch(values, ownerProfile, discoveryCity, usernameChanged);
      if (Object.keys(patch).length === 1) {
        setSaveError("Nenhuma alteração disponível para salvar nesta etapa.");
        return;
      }

      setIsSaving(true);
      try {
        const response = await socialGraphApi.updateMyAccount(patch);
        setOwnerProfile(response);
        const mappedUser = myAccountToUser(response);
        const updatedUser = {
          ...currentUser,
          ...mappedUser,
          commercialProfile: currentUser.commercialProfile && mappedUser.commercialProfile
            ? { ...currentUser.commercialProfile, ...mappedUser.commercialProfile }
            : mappedUser.commercialProfile,
        };
        updateAccount(updatedUser);
        addUser(updatedUser);
        setLocation(`/profile/${updatedUser.username}`);
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const updatedUser = currentUser.accountType === "personal"
      ? buildPersonalPreviewUser(values, currentUser)
      : buildCommercialPreviewUser(
          values,
          currentUser,
          discoveryCity,
          nextWeeklyHours,
          nextOpeningHours,
        );
    updateAccount(updatedUser);
    addUser(updatedUser);
    setLocation(`/profile/${updatedUser.username}`);
  }

  return {
    accountLoadError,
    currentUser,
    discoveryCity,
    formatChangeDate,
    form,
    goTo: setLocation,
    hoursError,
    isSaving,
    isServerAccount,
    onSubmit,
    ownerProfile,
    publicNameChangeDate,
    publicNameLocked,
    saveError,
    setDiscoveryCity,
    updateDayHours,
    usernameChangeDate,
    usernameLocked,
    weeklyHours,
  };
}

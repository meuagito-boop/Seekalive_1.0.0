import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileEditFormValues } from "@/pages/profile-edit/profileEditSchema";

export function ProfileDetailsFields({
  form,
}: {
  form: UseFormReturn<ProfileEditFormValues>;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="bio"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm text-muted-foreground">Bio</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} data-testid="input-bio" className="resize-none rounded-xl border-border bg-card" />
            </FormControl>
            <div className="text-right text-xs text-muted-foreground">{field.value?.length ?? 0}/160</div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm text-muted-foreground">Localização</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Cidade, País" data-testid="input-location" className="h-12 rounded-xl border-border bg-card" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="website"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm text-muted-foreground">Website</FormLabel>
            <FormControl>
              <Input {...field} placeholder="https://seusite.com" data-testid="input-website" className="h-12 rounded-xl border-border bg-card" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

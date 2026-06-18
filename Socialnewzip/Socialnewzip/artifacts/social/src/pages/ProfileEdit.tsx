import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { currentUser } from "@/data/mockData";

const schema = z.object({
  displayName: z.string().min(2),
  username: z.string().min(3).regex(/^[a-z0-9_]+$/),
  bio: z.string().max(160),
  location: z.string().max(50).optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileEdit() {
  const [, setLocation] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: currentUser.displayName,
      username: currentUser.username,
      bio: currentUser.bio,
      location: currentUser.location ?? "",
      website: currentUser.website ?? "",
    },
  });

  function onSubmit(_values: FormValues) {
    setLocation(`/profile/${currentUser.username}`);
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center justify-between px-4 h-14 border-b border-border">
        <button onClick={() => setLocation(-1 as never)} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Editar perfil</h1>
        <Button type="submit" form="edit-form" className="rounded-full h-8 px-5 text-sm font-semibold" data-testid="button-save">
          Salvar
        </Button>
      </div>

      <div className="relative mb-16">
        <div className="h-36 bg-gradient-to-br from-primary/20 via-accent/20 to-background relative cursor-pointer group overflow-hidden">
          <img src={currentUser.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="absolute -bottom-12 left-4 cursor-pointer group">
          <Avatar className="w-24 h-24 border-4 border-background">
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback className="text-2xl">{currentUser.displayName[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        <Form {...form}>
          <form id="edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Nome de exibição</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-display-name" className="h-12 bg-card border-border rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input {...field} data-testid="input-username" className="h-12 bg-card border-border rounded-xl pl-8" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      data-testid="input-bio"
                      className="bg-card border-border rounded-xl resize-none"
                    />
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
                    <Input {...field} placeholder="Cidade, País" data-testid="input-location" className="h-12 bg-card border-border rounded-xl" />
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
                    <Input {...field} placeholder="https://seusite.com" data-testid="input-website" className="h-12 bg-card border-border rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </motion.div>
    </div>
  );
}

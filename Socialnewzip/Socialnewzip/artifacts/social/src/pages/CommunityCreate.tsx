import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const categories = ["Design", "Tecnologia", "Fotografia", "Música", "Ciência", "Escrita", "Arte", "Games", "Esportes", "Outros"];

const schema = z.object({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter ao menos 10 caracteres").max(500),
  category: z.string().min(1, "Selecione uma categoria"),
  isPrivate: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function CommunityCreate() {
  const [, setLocation] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", category: "", isPrivate: false },
  });

  function onSubmit(_values: FormValues) {
    setLocation("/communities");
  }

  const isPrivate = form.watch("isPrivate");

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center justify-between px-4 h-14 border-b border-border">
        <button onClick={() => setLocation(-1 as never)} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Criar Comunidade</h1>
        <Button type="submit" form="create-community-form" className="rounded-full h-8 px-5 text-sm font-semibold" data-testid="button-create">
          Criar
        </Button>
      </div>

      <div className="relative mb-14">
        <div className="h-32 bg-gradient-to-br from-primary/30 via-accent/20 to-background flex items-center justify-center cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="absolute -bottom-10 left-4 w-20 h-20 rounded-2xl border-4 border-background bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
          <Camera className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4"
      >
        <Form {...form}>
          <form id="create-community-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Nome da comunidade</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ex: Design Matters" data-testid="input-name" className="h-12 bg-card border-border rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Descreva o propósito da comunidade..." data-testid="input-description" className="bg-card border-border rounded-xl resize-none" />
                  </FormControl>
                  <div className="text-right text-xs text-muted-foreground">{field.value?.length ?? 0}/500</div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Categoria</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => field.onChange(cat)}
                          data-testid={`category-${cat}`}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${field.value === cat ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPrivate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-muted-foreground">Privacidade</FormLabel>
                  <FormControl>
                    <div className="flex gap-3">
                      {[
                        { value: false, label: "Pública", icon: Globe, desc: "Qualquer pessoa pode entrar" },
                        { value: true, label: "Privada", icon: Lock, desc: "Requer aprovação" },
                      ].map(option => {
                        const Icon = option.icon;
                        const selected = field.value === option.value;
                        return (
                          <button
                            key={String(option.value)}
                            type="button"
                            onClick={() => field.onChange(option.value)}
                            data-testid={`privacy-${option.label}`}
                            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${selected ? "border-primary bg-primary/10" : "border-border"}`}
                          >
                            <Icon className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                            <div className="text-left">
                              <p className={`font-semibold text-sm ${selected ? "text-primary" : "text-foreground"}`}>{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </motion.div>
    </div>
  );
}

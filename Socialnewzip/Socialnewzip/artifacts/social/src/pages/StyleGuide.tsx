import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconButton } from "@/components/ui/icon-button";
import { SectionTitle } from "@/components/ui/section-title";
import {
  Bell, Heart, MessageCircle, Search, Settings, Share2,
  Shuffle, ShoppingBag, Star, Users, X, Plus, Check,
} from "lucide-react";

function ColorSwatch({ label, className, style }: { label: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`w-full h-12 rounded-lg border border-white/5 ${className ?? ""}`}
        style={style}
      />
      <span className="sk-text-meta text-muted-foreground">{label}</span>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <SectionTitle description={description}>{title}</SectionTitle>
      {children}
    </section>
  );
}

export default function StyleGuide() {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Page header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border px-5 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-[0_0_12px_hsl(24_95%_53%_/_0.35)]">
          <span className="text-white font-black text-xs">S</span>
        </div>
        <div>
          <h1 className="sk-text-section-title text-foreground leading-none">Design System</h1>
          <p className="sk-text-caption text-muted-foreground mt-0.5">SeekAlive · Visual Reference</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-8">

        {/* ── Colors ──────────────────────────────────────────────── */}
        <Section title="Cores" description="Paleta de cores do SeekAlive">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <ColorSwatch label="Brand Primary" style={{ background: "hsl(24 95% 53%)" }} />
            <ColorSwatch label="Brand Hover" style={{ background: "hsl(24 95% 46%)" }} />
            <ColorSwatch label="Brand Subtle" style={{ background: "hsl(24 95% 53% / 0.12)" }} />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <ColorSwatch label="Surface App" style={{ background: "hsl(225 20% 5%)" }} />
            <ColorSwatch label="Surface Card" style={{ background: "hsl(225 20% 8%)" }} />
            <ColorSwatch label="Surface Raised" style={{ background: "hsl(225 20% 11%)" }} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <ColorSwatch label="Success" style={{ background: "hsl(142 71% 45%)" }} />
            <ColorSwatch label="Warning" style={{ background: "hsl(38 92% 50%)" }} />
            <ColorSwatch label="Danger" style={{ background: "hsl(0 84% 60%)" }} />
            <ColorSwatch label="Info" style={{ background: "hsl(210 90% 58%)" }} />
          </div>
        </Section>

        {/* ── Typography ──────────────────────────────────────────── */}
        <Section title="Tipografia" description="Escala tipográfica do SeekAlive">
          <div className="space-y-4 sk-card p-5">
            <div>
              <p className="sk-text-meta text-muted-foreground mb-1">DISPLAY — 2rem / 800</p>
              <p className="sk-text-display text-foreground">SeekAlive</p>
            </div>
            <div>
              <p className="sk-text-meta text-muted-foreground mb-1">PAGE TITLE — 1.5rem / 700</p>
              <p className="sk-text-page-title text-foreground">Descoberta Local</p>
            </div>
            <div>
              <p className="sk-text-meta text-muted-foreground mb-1">SECTION TITLE — 1.125rem / 600</p>
              <p className="sk-text-section-title text-foreground">Lugares Próximos</p>
            </div>
            <div>
              <p className="sk-text-meta text-muted-foreground mb-1">BODY — 0.9375rem / 400</p>
              <p className="sk-text-body text-foreground">Explore o que há de melhor na sua cidade com o SeekAlive.</p>
            </div>
            <div>
              <p className="sk-text-meta text-muted-foreground mb-1">BODY SM — 0.875rem / 400</p>
              <p className="sk-text-body-sm text-muted-foreground">Uma rede social de descoberta local com social feed, busca e shop.</p>
            </div>
            <div>
              <p className="sk-text-meta text-muted-foreground mb-1">CAPTION — 0.75rem / 400</p>
              <p className="sk-text-caption text-muted-foreground">3.2K seguidores · 142 posts</p>
            </div>
            <div>
              <p className="sk-text-meta text-muted-foreground mb-1">META — 0.6875rem / 500 / UPPERCASE</p>
              <p className="sk-text-meta text-muted-foreground">Tendência · São Paulo</p>
            </div>
          </div>
        </Section>

        {/* ── Buttons ─────────────────────────────────────────────── */}
        <Section title="Botões" description="Variantes de botão">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Primary</Button>
              <Button variant="brand">Brand</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="destructive">Destructive</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="link">Link</Button>
              <Button variant="default" disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl" variant="brand">Extra Large</Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="icon" variant="default"><Bell className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost"><Heart className="w-4 h-4" /></Button>
              <Button size="icon" variant="outline"><Share2 className="w-4 h-4" /></Button>
            </div>
          </div>
        </Section>

        {/* ── Icon Buttons ────────────────────────────────────────── */}
        <Section title="Icon Buttons" description="Botões de ícone com variantes">
          <div className="flex flex-wrap gap-3 items-center sk-card p-4">
            <IconButton variant="default" size="md" label="Notificações"><Bell /></IconButton>
            <IconButton variant="ghost" size="md" label="Curtir"><Heart /></IconButton>
            <IconButton variant="surface" size="md" label="Compartilhar"><Share2 /></IconButton>
            <IconButton variant="brand" size="md" label="Adicionar"><Plus /></IconButton>
            <IconButton variant="destructive" size="md" label="Fechar"><X /></IconButton>
            <IconButton variant="ghost" size="sm" label="Buscar"><Search /></IconButton>
            <IconButton variant="ghost" size="lg" label="Configurações"><Settings /></IconButton>
          </div>
        </Section>

        {/* ── Inputs ──────────────────────────────────────────────── */}
        <Section title="Inputs" description="Campos de texto">
          <div className="space-y-3">
            <Input placeholder="Buscar lugares, pessoas..." value={inputValue} onChange={e => setInputValue(e.target.value)} />
            <Input placeholder="Placeholder disabled" disabled />
            <Input type="password" placeholder="Senha" />
            <Input type="email" placeholder="seu@email.com" />
          </div>
        </Section>

        {/* ── Badges ──────────────────────────────────────────────── */}
        <Section title="Badges" description="Etiquetas e indicadores">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Primary</Badge>
            <Badge variant="brand">Brand</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="destructive">Danger</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </Section>

        {/* ── Avatar ──────────────────────────────────────────────── */}
        <Section title="Avatar" description="Fotos de perfil">
          <div className="flex flex-wrap gap-4 items-end sk-card p-4">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">SA</AvatarFallback>
              </Avatar>
              <span className="sk-text-caption text-muted-foreground">xs</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/15 text-primary font-bold">JD</AvatarFallback>
              </Avatar>
              <span className="sk-text-caption text-muted-foreground">sm</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-14 h-14">
                <AvatarFallback className="bg-primary/15 text-primary text-lg font-bold">MK</AvatarFallback>
              </Avatar>
              <span className="sk-text-caption text-muted-foreground">md</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Avatar className="w-20 h-20">
                <AvatarFallback className="bg-primary/15 text-primary text-2xl font-bold">RB</AvatarFallback>
              </Avatar>
              <span className="sk-text-caption text-muted-foreground">lg</span>
            </div>
          </div>
        </Section>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <Section title="Tabs" description="Navegação por abas">
          <Tabs defaultValue="social">
            <TabsList>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="seek">Seek</TabsTrigger>
              <TabsTrigger value="shop">Shop</TabsTrigger>
            </TabsList>
            <TabsContent value="social">
              <div className="p-4 sk-card mt-3 sk-text-body text-muted-foreground">
                Feed social e postagens
              </div>
            </TabsContent>
            <TabsContent value="seek">
              <div className="p-4 sk-card mt-3 sk-text-body text-muted-foreground">
                Busca de lugares e eventos
              </div>
            </TabsContent>
            <TabsContent value="shop">
              <div className="p-4 sk-card mt-3 sk-text-body text-muted-foreground">
                Shop local
              </div>
            </TabsContent>
          </Tabs>
        </Section>

        {/* ── Cards ───────────────────────────────────────────────── */}
        <Section title="Cards" description="Superfícies de conteúdo">
          <div className="space-y-3">
            {/* Post card */}
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/15 text-primary font-bold">AV</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-sm font-semibold">Ana Vieira</CardTitle>
                    <CardDescription className="sk-text-caption">@anavieira · 2min</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="sk-text-body-sm text-foreground mb-3">
                  Acabei de descobrir esse lugar incrível aqui no centro! 🧡
                </p>
                <div className="flex gap-4">
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Heart className="w-4 h-4" />
                    <span className="sk-text-caption">142</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span className="sk-text-caption">28</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Share2 className="w-4 h-4" />
                    <span className="sk-text-caption">Share</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Notification card */}
            <Card>
              <CardContent className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="sk-text-body-sm text-foreground font-medium">João curtiu sua publicação</p>
                  <p className="sk-text-caption text-muted-foreground">5 minutos atrás</p>
                </div>
                <Badge variant="brand">Novo</Badge>
              </CardContent>
            </Card>

            {/* Place card */}
            <Card>
              <CardContent className="px-4 py-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="sk-text-body-sm text-foreground font-semibold">Café Moderno</p>
                  <p className="sk-text-caption text-muted-foreground">São Paulo · 0.8km</p>
                </div>
                <Badge variant="success">Aberto</Badge>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ── Bottom Nav preview ──────────────────────────────────── */}
        <Section title="Navegação" description="Itens da barra inferior">
          <div className="sk-card p-4 flex items-center justify-around">
            {[
              { icon: Search, label: "Seek", active: false },
              { icon: Users, label: "Social", active: true },
              { icon: Plus, label: "Add", active: false },
              { icon: Shuffle, label: "Roleta", active: false },
              { icon: ShoppingBag, label: "Shop", active: false },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-10 h-10 flex items-center justify-center"
                  style={{ color: item.active ? "hsl(24 95% 53%)" : undefined }}
                >
                  <item.icon
                    className={item.active ? "w-6 h-6" : "w-6 h-6 text-muted-foreground"}
                    strokeWidth={item.active ? 2.5 : 2}
                  />
                </div>
                <span
                  className="sk-text-caption font-medium"
                  style={{ color: item.active ? "hsl(24 95% 53%)" : "hsl(var(--muted-foreground))" }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </Section>

      </div>
    </div>
  );
}

import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Plus, X, Trash2, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { mockCommunities, mockUsers, getUserById } from "@/data/mockData";

export default function CommunitySettings() {
  const params = useParams<{ communityId: string }>();
  const [, setLocation] = useLocation();
  const community = mockCommunities.find(c => c.id === params.communityId) ?? mockCommunities[0];

  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [rules, setRules] = useState(community.rules);
  const [newRule, setNewRule] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const owner = getUserById(community.ownerId) ?? mockUsers[0];
  const mods = community.moderatorIds.map(id => getUserById(id)).filter(Boolean);

  function addRule() {
    if (newRule.trim()) {
      setRules(prev => [...prev, newRule.trim()]);
      setNewRule("");
    }
  }

  function removeRule(i: number) {
    setRules(prev => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg flex items-center justify-between px-4 h-14 border-b border-border">
        <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Configurações</h1>
        <Button onClick={() => setLocation(`/communities/${community.id}`)} className="rounded-full h-8 px-5 text-sm font-semibold" data-testid="button-save">
          Salvar
        </Button>
      </div>

      <div className="relative mb-14">
        <div className="h-32 bg-gradient-to-br from-primary/30 to-background relative cursor-pointer group overflow-hidden">
          {community.bannerUrl && <img src={community.bannerUrl} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="absolute -bottom-10 left-4 cursor-pointer group">
          <Avatar className="w-20 h-20 border-4 border-background rounded-2xl">
            <AvatarImage src={community.iconUrl} />
            <AvatarFallback className="text-2xl rounded-2xl">{community.name[0]}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-4 space-y-6">
        <div className="space-y-4">
          <h2 className="font-bold text-base">Informações básicas</h2>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Nome</label>
            <Input value={name} onChange={e => setName(e.target.value)} data-testid="input-name" className="h-12 bg-card border-border rounded-xl" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} data-testid="input-description" className="bg-card border-border rounded-xl resize-none" />
          </div>
        </div>

        <div>
          <h2 className="font-bold text-base mb-3">Moderadores</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
              <Avatar className="w-9 h-9"><AvatarImage src={owner.avatarUrl} /><AvatarFallback>{owner.displayName[0]}</AvatarFallback></Avatar>
              <div className="flex-1"><p className="font-semibold text-sm">{owner.displayName}</p><p className="text-xs text-muted-foreground">@{owner.username}</p></div>
              <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded-full">Dono</span>
            </div>
            {mods.map(mod => mod && (
              <div key={mod.id} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                <Avatar className="w-9 h-9"><AvatarImage src={mod.avatarUrl} /><AvatarFallback>{mod.displayName[0]}</AvatarFallback></Avatar>
                <div className="flex-1"><p className="font-semibold text-sm">{mod.displayName}</p><p className="text-xs text-muted-foreground">@{mod.username}</p></div>
                <button className="text-muted-foreground hover:text-destructive" data-testid={`button-remove-mod-${mod.id}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-3 rounded-xl border-dashed" data-testid="button-add-moderator">
            <Plus className="w-4 h-4 mr-2" /> Adicionar moderador
          </Button>
        </div>

        <div>
          <h2 className="font-bold text-base mb-3">Regras da comunidade</h2>
          <div className="space-y-2 mb-3">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 p-3 bg-card rounded-xl border border-border">
                <span className="text-primary font-bold text-sm shrink-0">{i + 1}.</span>
                <p className="flex-1 text-sm">{rule}</p>
                <button onClick={() => removeRule(i)} className="text-muted-foreground hover:text-destructive shrink-0" data-testid={`button-remove-rule-${i}`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              placeholder="Nova regra..."
              data-testid="input-new-rule"
              className="h-10 bg-card border-border rounded-xl text-sm"
              onKeyDown={e => e.key === "Enter" && addRule()}
            />
            <Button onClick={addRule} className="h-10 px-4 rounded-xl" data-testid="button-add-rule">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="border border-destructive/30 rounded-2xl p-4 bg-destructive/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="font-bold text-destructive">Zona de perigo</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Deletar esta comunidade é uma ação permanente e não pode ser desfeita.</p>
          {!showDeleteConfirm ? (
            <Button variant="destructive" className="w-full rounded-xl" onClick={() => setShowDeleteConfirm(true)} data-testid="button-delete">
              <Trash2 className="w-4 h-4 mr-2" /> Deletar comunidade
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-center text-destructive">Tem certeza? Esta ação é irreversível.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDeleteConfirm(false)} data-testid="button-cancel-delete">Cancelar</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => setLocation("/communities")} data-testid="button-confirm-delete">Deletar</Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

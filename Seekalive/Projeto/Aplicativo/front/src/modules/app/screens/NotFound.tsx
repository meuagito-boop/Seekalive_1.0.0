import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[60dvh] w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-primary shrink-0" aria-hidden />
            <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Este endereço não existe ou a página foi removida.
          </p>
          <Link href="/feed" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">Voltar ao Social</Link>
        </CardContent>
      </Card>
    </div>
  );
}

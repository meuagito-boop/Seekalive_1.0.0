import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { Circle } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Splash() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center max-w-md w-full text-center space-y-8">
        <Circle className="w-24 h-24 text-primary fill-primary" />
        <h1 className="text-5xl font-bold tracking-tighter">SeekAlive</h1>
        <p className="text-xl text-muted-foreground">Join the conversation. Share your world.</p>
        
        <div className="w-full space-y-4 pt-8">
          <Link href="/register">
            <Button className="w-full h-14 text-lg rounded-full font-bold" data-testid="button-create-account">
              Create Account
            </Button>
          </Link>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Link href="/login">
            <Button variant="outline" className="w-full h-14 text-lg rounded-full font-bold" data-testid="button-login">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { LogOut } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { LogoutButtonProps } from "@/types";

import { Button } from "@/components/ui/button";

export function LogoutButton({
  className,
  onSuccess,
  onError,
  label = "Sign out",
  children,
}: LogoutButtonProps) {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      onSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Logout failed");
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (children) {
    return (
      <span
        onClick={handleLogout}
        className={cn("cursor-pointer", className)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleLogout()}
      >
        {children({ isLoading })}
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      disabled={isLoading}
      className={cn("gap-2", className)}
    >
      <LogOut className="h-4 w-4" />
      {isLoading ? "Signing out…" : label}
    </Button>
  );
}

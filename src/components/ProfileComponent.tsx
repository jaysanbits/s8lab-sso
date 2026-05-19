import { Mail, Phone, Pencil } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import type { ProfileComponentProps } from "@/types";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/LogoutButton";

export function ProfileComponent({
  className,
  onEditProfile,
  showLogout = true,
  onLogoutSuccess,
}: ProfileComponentProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardContent className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">Not signed in</p>
        </CardContent>
      </Card>
    );
  }

  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={fullName} />
            )}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1">
            <CardTitle className="text-xl">{fullName}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>

          {onEditProfile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditProfile(user)}
              aria-label="Edit profile"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-4 pt-4">
        {/* Email */}
        <ProfileField
          icon={<Mail className="h-4 w-4 text-muted-foreground" />}
          label="Email"
          value={user.email}
        />

        {/* WhatsApp */}
        {user.whatsappNumber && (
          <ProfileField
            icon={<Phone className="h-4 w-4 text-muted-foreground" />}
            label="WhatsApp"
            value={user.whatsappNumber}
          />
        )}

        {/* Extra fields — render any additional user properties */}
        {Object.entries(user)
          .filter(
            ([key]) =>
              !["id", "email", "firstName", "lastName", "whatsappNumber", "avatarUrl"].includes(key)
          )
          .map(([key, val]) =>
            typeof val === "string" || typeof val === "number" ? (
              <ProfileField
                key={key}
                label={toLabel(key)}
                value={String(val)}
              />
            ) : null
          )}

        {showLogout && (
          <>
            <Separator />
            <LogoutButton
              className="w-full"
              onSuccess={onLogoutSuccess}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ProfileFieldProps {
  icon?: React.ReactNode;
  label: string;
  value: string;
}

function ProfileField({ icon, label, value }: ProfileFieldProps) {
  return (
    <div className="flex items-center gap-3">
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm">{value}</p>
      </div>
    </div>
  );
}

function toLabel(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";

interface AvatarProps {
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-lg" };

export function Avatar({ src, firstName, lastName, username, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={username ?? "avatar"}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        sizeClasses[size],
        className,
      )}
    >
      {initials(firstName, lastName, username)}
    </div>
  );
}

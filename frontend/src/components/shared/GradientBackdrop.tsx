import { cn } from "@/utils/cn";

/**
 * Fond décoratif : quelques taches floutées dans les tons de marque
 * (+ un soupçon d'or et de vert). Volontairement discret — le brief
 * de marque demande blanc dominant et "pas de gradients excessifs",
 * donc pas un vrai arc-en-ciel multi-teintes, juste un peu de relief.
 */
export function GradientBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -top-32 -left-20 size-80 rounded-full bg-primary/[0.18] blur-3xl sm:size-[28rem]" />
      <div className="absolute -top-16 right-[-5rem] size-80 rounded-full bg-[#B7791F]/[0.16] blur-3xl sm:size-96" />
      <div className="absolute bottom-[-8rem] left-1/3 size-80 rounded-full bg-[#16803C]/[0.13] blur-3xl sm:size-[26rem]" />
      <div className="absolute top-1/3 left-1/2 size-72 -translate-x-1/2 rounded-full bg-secondary/[0.10] blur-3xl" />
    </div>
  );
}

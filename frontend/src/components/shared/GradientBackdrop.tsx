import { cn } from "@/utils/cn";

/**
 * Fond décoratif : quelques taches floutées dans les tons de marque
 * (+ un accent bleu ciel plus vif). Le blanc reste dominant — pas un
 * vrai arc-en-ciel multi-teintes, juste assez de couleur et de flou
 * pour donner du relief.
 */
export function GradientBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -top-32 -left-20 size-80 rounded-full bg-primary/[0.22] blur-3xl sm:size-[28rem]" />
      <div className="absolute -top-24 right-[-6rem] size-96 rounded-full bg-accent/[0.24] blur-3xl sm:size-[30rem]" />
      <div className="absolute top-1/4 right-1/4 size-72 rounded-full bg-[#B7791F]/[0.16] blur-3xl sm:size-96" />
      <div className="absolute bottom-[-8rem] left-1/3 size-80 rounded-full bg-[#16803C]/[0.14] blur-3xl sm:size-[26rem]" />
      <div className="absolute top-1/3 left-1/2 size-72 -translate-x-1/2 rounded-full bg-secondary/[0.12] blur-3xl" />
    </div>
  );
}

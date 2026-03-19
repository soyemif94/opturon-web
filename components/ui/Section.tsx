import { cn } from "@/lib/cn";

type SectionProps = React.PropsWithChildren<{
  id?: string;
  className?: string;
  containerClassName?: string;
}>;

export function Section({ id, className, containerClassName, children }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative py-16 md:py-24",
        id ? "scroll-mt-28 md:scroll-mt-32 lg:scroll-mt-36" : "",
        className
      )}
    >
      <div className={cn("container-opt", containerClassName)}>
        {children}
      </div>
    </section>
  );
}

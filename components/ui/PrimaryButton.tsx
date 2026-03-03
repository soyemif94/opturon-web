import Link from "next/link";
import { cn } from "@/lib/cn";

type PrimaryButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function PrimaryButton({ href, children, className, ariaLabel }: PrimaryButtonProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white",
        "shadow-brand transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brandBright",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandBright focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        className
      )}
    >
      {children}
    </Link>
  );
}


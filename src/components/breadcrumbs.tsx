import { ChevronRight } from "lucide-react";
import Link from "next/link";

// The last item is the current page and isn't a link.
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 pb-3 text-sm">
      <ol className="-ml-1 flex min-w-0 items-center gap-1.5 text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
            {item.href ? (
              <Link
                href={item.href}
                className="shrink-0 rounded px-1 py-0.5 transition-colors duration-150 hover:bg-muted hover:text-primary focus-visible:text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate px-1 font-medium text-primary">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

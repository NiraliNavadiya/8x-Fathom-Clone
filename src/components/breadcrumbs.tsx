import { ChevronRight } from "lucide-react";
import Link from "next/link";

// The last item is the current page and isn't a link.
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex min-w-0 items-center gap-1 text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="rounded transition-colors hover:text-primary focus-visible:text-primary">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-foreground">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

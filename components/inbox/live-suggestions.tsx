import type { SuggestionItem } from "@/lib/suggestions/getSuggestions";

export function LiveSuggestions({
  items,
  onSelect
}: {
  items: SuggestionItem[];
  onSelect: (item: SuggestionItem) => void;
}) {
  if (!items.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={`${item.type}-${item.id}`}
          type="button"
          onClick={() => onSelect(item)}
          className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs hover:bg-muted"
        >
          {item.type === "template" ? `Template: ${item.label}` : null}
          {item.type === "product" ? `Producto: ${item.label}` : null}
          {item.type === "action" ? `Accion: ${item.label}` : null}
        </button>
      ))}
    </div>
  );
}


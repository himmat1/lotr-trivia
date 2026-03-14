// ─── Category Header ──────────────────────────────────────────────────────────
// Renders the title cell at the top of each Jeopardy board column.

interface CategoryHeaderProps {
  name: string;
}

export default function CategoryHeader({ name }: CategoryHeaderProps) {
  return (
    <div
      className="category-header flex items-center justify-center text-center
                 px-2 py-4 rounded-t h-20 select-none"
    >
      <span
        className="text-xs font-bold tracking-wide text-[var(--color-gold)] uppercase leading-tight"
        style={{ fontFamily: "var(--font-cinzel)" }}
      >
        {name}
      </span>
    </div>
  );
}

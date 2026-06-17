import Link from "next/link";

export type NeedsAttentionItem = {
  id: string;
  label: string;
  href: string;
  severity?: "warning" | "error" | "info";
};

type NeedsAttentionProps = {
  items: NeedsAttentionItem[];
};

export function NeedsAttention({ items }: NeedsAttentionProps) {
  if (items.length === 0) return null;

  return (
    <section className="needs-attention">
      <div className="needs-attention__header">
        <h2 className="needs-attention__title">Needs attention</h2>
      </div>
      <ul className="needs-attention__list">
        {items.map((item) => (
          <li key={item.id} className="needs-attention__item">
            <span>{item.label}</span>
            <Link href={item.href}>View</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

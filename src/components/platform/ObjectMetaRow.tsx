type ObjectMetaRowProps = {
  items: Array<{ label: string; value: string }>;
};

export function ObjectMetaRow({ items }: ObjectMetaRowProps) {
  if (items.length === 0) return null;
  return (
    <div className="object-meta-row">
      {items.map((item) => (
        <span key={item.label} className="object-meta-chip">
          <span>{item.label}:</span>
          <span>{item.value}</span>
        </span>
      ))}
    </div>
  );
}

export default function Collapse({ title, defaultOpen = false, id, children }) {
  return (
    <details className="collapse" open={defaultOpen} id={id}>
      <summary>{title}</summary>
      <div className="collapse-body">{children}</div>
    </details>
  );
}

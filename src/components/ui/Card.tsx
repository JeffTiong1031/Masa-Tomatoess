export default function Card({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`mt-soft p-5 ${className}`}>{children}</div>;
}

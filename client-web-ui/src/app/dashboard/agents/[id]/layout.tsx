export function generateStaticParams() {
  return [{ id: "0" }];
}

export default function AgentIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

export function generateStaticParams() {
  // 静态导出模式下需预生成所有可能的 [id] 路径，覆盖 0-199 以支持常见知识库 ID
  return Array.from({ length: 200 }, (_, i) => ({ id: String(i) }));
}

export default function KnowledgeIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

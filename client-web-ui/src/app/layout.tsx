import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Linkyun Agent",
  description: "AI Agent 工作台",
};

/** 首屏前执行，根据持久化的 theme 设置 dark class，避免闪烁 */
function ThemeScript() {
  const script = `
(function(){
  try {
    var raw = localStorage.getItem("linkyun-theme");
    var mode = raw ? (JSON.parse(raw).mode || "system") : "system";
    var isDark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch(e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-text-primary font-sans">
        <ThemeScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

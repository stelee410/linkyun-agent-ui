"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    if (auth?.apiKey) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-zinc-400">加载中...</div>
    </div>
  );
}

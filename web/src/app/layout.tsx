import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SideNav from "@/components/SideNav";

const sora = Sora({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "OpAlign — 跨框架模型转换 · 算子语义对齐",
  description:
    "源代码级跨框架深度学习模型转换工具：在算子语义层面对齐 PyTorch 与 PaddlePaddle，支持语法映射、分层对齐与缺失算子等价构建。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${sora.variable} ${jetbrains.variable} font-sans`}>
        <div className="flex min-h-screen">
          <SideNav />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

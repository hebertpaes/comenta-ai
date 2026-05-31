import Link from "next/link";
import { MessageSquareCode } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="flex items-center gap-2 font-bold text-xl mb-12">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
          <MessageSquareCode className="w-4 h-4 text-white" />
        </div>
        <span className="gradient-text">Comenta.AI</span>
      </Link>
      {children}
    </div>
  );
}

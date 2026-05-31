"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Falha no login");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold text-center mb-2">Bem-vindo de volta</h1>
      <p className="text-white/40 text-center text-sm mb-8">
        Entre na sua conta para continuar
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-white/60 mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="seu@email.com"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-white/40 mt-6">
        Não tem uma conta?{" "}
        <Link href="/register" className="text-brand-400 hover:text-brand-300 transition-colors">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Falha no cadastro");
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
      <h1 className="text-2xl font-bold text-center mb-2">Criar sua conta</h1>
      <p className="text-white/40 text-center text-sm mb-8">
        Grátis para sempre. Sem cartão de crédito.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Seu nome"
            required
          />
        </div>

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
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
          {loading ? "Criando conta..." : "Criar conta grátis"}
        </button>
      </form>

      <p className="text-center text-xs text-white/25 mt-4">
        Ao criar uma conta você concorda com os{" "}
        <Link href="/terms" className="underline">Termos de Uso</Link> e{" "}
        <Link href="/privacy" className="underline">Política de Privacidade</Link>.
      </p>

      <p className="text-center text-sm text-white/40 mt-4">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-brand-400 hover:text-brand-300 transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  );
}

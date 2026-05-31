import Link from "next/link";
import { Check, Zap } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    period: "para sempre",
    description: "Ideal para blogs pessoais e projetos pequenos.",
    features: [
      "1.000 comentários/mês",
      "1 site",
      "Moderação automática com IA",
      "Dashboard básico",
      "API REST",
    ],
    cta: "Começar grátis",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 49",
    period: "por mês",
    description: "Para criadores de conteúdo e empresas em crescimento.",
    features: [
      "50.000 comentários/mês",
      "10 sites",
      "Moderação automática com IA",
      "Dashboard avançado + Analytics",
      "Widget personalizável",
      "Webhooks",
      "Suporte prioritário",
    ],
    cta: "Começar Pro",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para grandes plataformas com necessidades específicas.",
    features: [
      "Comentários ilimitados",
      "Sites ilimitados",
      "SLA garantido",
      "Thresholds customizados por IA",
      "On-premise disponível",
      "SSO & SAML",
      "Suporte dedicado 24/7",
    ],
    cta: "Falar com vendas",
    href: "mailto:vendas@comenta.ai",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Preços simples e{" "}
            <span className="gradient-text">transparentes</span>
          </h2>
          <p className="text-white/50 text-lg">
            Sem surpresas. Cancele quando quiser.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? "bg-brand-600/10 border-2 border-brand-500/50 shadow-xl shadow-brand-500/10"
                  : "glass"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    <Zap className="w-3 h-3" />
                    Mais popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-white/40 text-sm">/{plan.period}</span>}
                </div>
                <p className="text-white/40 text-sm mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={plan.highlight ? "btn-primary justify-center" : "btn-secondary justify-center"}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

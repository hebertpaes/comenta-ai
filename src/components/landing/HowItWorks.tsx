import { Code2, Brain, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Code2,
    step: "01",
    title: "Integre em minutos",
    description: "Copie um snippet de JavaScript e cole no seu site. Nossa API REST também está disponível para integrações customizadas.",
    code: `<script src="https://cdn.comenta.ai/widget.js"
  data-site-id="seu-site-id"
  data-api-key="sua-api-key">
</script>`,
  },
  {
    icon: Brain,
    step: "02",
    title: "IA modera automaticamente",
    description: "Cada comentário enviado é analisado pelo Claude AI em tempo real. Spam, toxicidade e conteúdo inadequado são detectados com 99%+ de precisão.",
    code: `// Resposta da API de moderação
{
  "score": 0.08,
  "label": "spam",
  "reason": "Link promocional detectado",
  "decision": "reject"
}`,
  },
  {
    icon: CheckCircle,
    step: "03",
    title: "Você controla o restante",
    description: "Comentários seguros são aprovados automaticamente. Casos duvidosos chegam para você revisar. Você define os thresholds de aprovação.",
    code: `// Configuração dos thresholds
{
  "auto_approve": 0.8,   // score >= 0.8: aprovado
  "auto_reject": 0.3,    // score < 0.3: rejeitado
  "manual_review": true  // 0.3-0.8: revisão humana
}`,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Como funciona
          </h2>
          <p className="text-white/50 text-lg">
            Do setup à moderação automática em menos de 5 minutos.
          </p>
        </div>

        <div className="space-y-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.step} className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} gap-8 items-center`}>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-5xl font-bold text-white/5">{step.step}</span>
                    <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                  <p className="text-white/50 leading-relaxed">{step.description}</p>
                </div>
                <div className="flex-1">
                  <div className="glass rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/5">
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                      <span className="text-xs text-white/30 font-mono">exemplo</span>
                    </div>
                    <pre className="p-4 text-xs text-green-400/80 font-mono overflow-x-auto leading-relaxed">
                      <code>{step.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

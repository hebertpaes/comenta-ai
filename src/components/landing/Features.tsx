import { Shield, Zap, BarChart3, Code, Globe, Bell } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Moderação Automática",
    description: "Nossa IA analisa cada comentário em tempo real, detectando spam, discurso de ódio e conteúdo tóxico antes mesmo de aparecer no seu site.",
    color: "from-brand-500 to-purple-500",
  },
  {
    icon: Zap,
    title: "Resposta em Milissegundos",
    description: "Usando o Claude AI da Anthropic, processamos e classificamos comentários em menos de 50ms — sem impacto na experiência do usuário.",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: BarChart3,
    title: "Analytics Detalhados",
    description: "Acompanhe padrões de comentários, taxas de spam, sentimento da comunidade e muito mais com dashboards interativos.",
    color: "from-green-500 to-teal-500",
  },
  {
    icon: Code,
    title: "Integração Simples",
    description: "Um snippet de JavaScript e sua seção de comentários já está protegida. Compatível com qualquer plataforma: WordPress, Ghost, sites estáticos.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Globe,
    title: "Multilingue",
    description: "Detecta e modera comentários em qualquer idioma. Português, inglês, espanhol e mais de 50 idiomas suportados nativamente.",
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Bell,
    title: "Alertas Inteligentes",
    description: "Receba notificações apenas para comentários que precisam de revisão humana. Controle total sem sobrecarga de informação.",
    color: "from-purple-500 to-violet-500",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Tudo que você precisa para{" "}
            <span className="gradient-text">moderar com confiança</span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Uma plataforma completa para gerenciar a comunidade do seu site com o poder da inteligência artificial.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card hover:border-white/20 transition-all duration-300 group">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

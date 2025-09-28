import { useNavigate } from "react-router-dom";
import AnimatedCard from "../components/AnimatedCard";
import { motion } from "framer-motion";
import { Film, AudioLines, ImageIcon, Subtitles } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  const Card = ({ title, desc, to, icon: Icon }: any) => (
    <AnimatedCard className="cursor-pointer" onClick={() => navigate(to)}>
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-white/70 text-sm">{desc}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white text-black px-4 py-2 text-sm font-medium">
            Começar
          </div>
        </div>
      </div>
    </AnimatedCard>
  );

  return (
    <div className="min-h-screen text-white bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(255,255,255,.18),transparent),linear-gradient(180deg,rgba(10,10,12,.8),#0b0b10)]">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-white/10 rounded flex items-center justify-center text-xs font-bold">WE</div>
          <div className="text-white/60 text-sm">Orçamento de Produção - RTV WE</div>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <button onClick={() => navigate("/admin")} className="hover:underline">Admin</button>
          <button onClick={() => navigate("/login")} className="rounded-lg border border-white/20 px-3 py-1.5">Entrar</button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-semibold"
        >
          Sistema de orçamentos <span className="text-white/70">WE</span>
        </motion.h1>
        <p className="text-white/70 mt-3 max-w-2xl">
          Crie, compare e exporte orçamentos: <strong>Filme</strong>, <strong>Áudio</strong>, <strong>Imagens</strong>, <strong>Closed Caption</strong>.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <Card title="Produção de filme" desc="Cotações e comparador. Honorário automático." to="/new/filme" icon={Film} />
          <Card title="Produção de áudio" desc="Serviços de áudio com opções por produtora." to="/new/audio" icon={AudioLines} />
          <Card title="Compra de imagem" desc="Shutterstock/Getty/Personalizado com auto-preenchimento por link." to="/new/imagem" icon={ImageIcon} />
          <Card title="Closed Caption" desc="R$ 900 por versão. Cálculo automático." to="/new/cc" icon={Subtitles} />
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-medium mb-3">Ações rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate("/import")} className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Importar carta</button>
            <button onClick={() => navigate("/duplicate")} className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Duplicar orçamento</button>
            <button onClick={() => navigate("/admin")} className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Abrir Admin</button>
          </div>
        </section>
      </main>
    </div>
  );
}
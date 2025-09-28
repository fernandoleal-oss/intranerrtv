import { motion } from 'framer-motion'

interface PreviewData {
  filme?: { subtotal?: number }
  audio?: { subtotal?: number }
  cc?: { qtd?: number, total?: number }
  imagens?: { qtd?: number, total?: number }
  honorario?: number
  total?: number
}

interface PreviewSidebarProps {
  data: PreviewData
}

export function PreviewSidebar({ data }: PreviewSidebarProps) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value)

  const Block = ({ title, items }: { title: string, items: { k: string; v: string | number }[] }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 p-4 bg-white/5 backdrop-blur-sm"
    >
      <div className="text-xs uppercase tracking-wider text-white/60 mb-3 font-medium">
        {title}
      </div>
      <dl className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between gap-4 text-sm">
            <dt className="text-white/70">{item.k}</dt>
            <dd className="text-white font-medium">{item.v}</dd>
          </div>
        ))}
      </dl>
    </motion.div>
  )

  return (
    <aside className="w-full xl:w-96 shrink-0 space-y-4">
      {data.filme && (
        <Block 
          title="Filme" 
          items={[
            { k: 'Subtotal', v: formatCurrency(data.filme.subtotal || 0) }
          ]} 
        />
      )}
      
      {data.audio && (
        <Block 
          title="Áudio" 
          items={[
            { k: 'Subtotal', v: formatCurrency(data.audio.subtotal || 0) }
          ]} 
        />
      )}
      
      {data.cc && (
        <Block 
          title="Closed Caption" 
          items={[
            { k: 'Versões', v: data.cc.qtd || 0 },
            { k: 'Total', v: formatCurrency(data.cc.total || 0) }
          ]} 
        />
      )}
      
      {data.imagens && (
        <Block 
          title="Imagens" 
          items={[
            { k: 'Itens', v: data.imagens.qtd || 0 },
            { k: 'Total', v: formatCurrency(data.imagens.total || 0) }
          ]} 
        />
      )}
      
      {data.honorario != null && (
        <Block 
          title="Honorários" 
          items={[
            { k: 'Valor', v: formatCurrency(data.honorario) }
          ]} 
        />
      )}
      
      <Block 
        title="Total Geral" 
        items={[
          { k: 'Total', v: formatCurrency(data.total || 0) }
        ]} 
      />
    </aside>
  )
}
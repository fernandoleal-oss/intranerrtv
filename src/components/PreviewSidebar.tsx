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
    }).format(value || 0)

  const Block = ({ title, items }: { title: string, items: { k: string; v: string | number }[] }) => (
    <div className="glass-effect rounded-xl p-4 space-y-3">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center text-sm">
            <span className="text-foreground/80">{item.k}</span>
            <span className="font-medium text-foreground">
              {typeof item.v === 'number' ? formatCurrency(item.v) : item.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <aside className="w-full xl:w-80 space-y-4">
      {data.filme && (
        <Block 
          title="Filme" 
          items={[
            { k: 'Subtotal', v: data.filme.subtotal || 0 }
          ]} 
        />
      )}
      
      {data.audio && (
        <Block 
          title="Áudio" 
          items={[
            { k: 'Subtotal', v: data.audio.subtotal || 0 }
          ]} 
        />
      )}
      
      {data.cc && (
        <Block 
          title="Closed Caption" 
          items={[
            { k: 'Versões', v: data.cc.qtd || 0 },
            { k: 'Total', v: data.cc.total || 0 }
          ]} 
        />
      )}
      
      {data.imagens && (
        <Block 
          title="Imagens" 
          items={[
            { k: 'Itens', v: data.imagens.qtd || 0 },
            { k: 'Total', v: data.imagens.total || 0 }
          ]} 
        />
      )}
      
      {data.honorario != null && (
        <Block 
          title="Honorários" 
          items={[
            { k: 'Valor', v: data.honorario }
          ]} 
        />
      )}
      
      <div className="glass-effect rounded-xl p-4 border border-primary/20">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-foreground">Total Geral</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(data.total || 0)}
          </span>
        </div>
      </div>
    </aside>
  )
}
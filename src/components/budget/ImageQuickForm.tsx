import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ExternalLink, Trash2, Plus, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { fnGet } from '@/lib/functions'
import { ClientProductAutocomplete } from '@/components/ClientProductAutocomplete'

interface AssetMetadata {
  provider: string
  type: 'video' | 'image' | 'unknown'
  id: string | null
  title: string | null
  durationSeconds?: number
  resolution?: { width: number; height: number } | null
  thumbnail?: string | null
  licenseOptions: string[]
  recommendedLicense: string
  pageUrl: string
  chosenLicense?: string
  price?: number
  customDescription?: string
  isManual?: boolean
  referenciaImageUrl?: string
  referenciaImageId?: string
}

interface Producer {
  name: string
  email: string
}

interface FormData {
  producer: Producer
  cliente: string
  produto: string
  midias: string
  banco: 'shutterstock' | 'getty' | 'personalizado' | ''
  assets: AssetMetadata[]
  observacoes?: string
}

interface ImageQuickFormProps {
  onSave: (data: FormData) => void
  initialData?: Partial<FormData>
}

export function ImageQuickForm({ onSave, initialData }: ImageQuickFormProps) {
  const { toast } = useToast()
  const [producer, setProducer] = useState<Producer>(
    initialData?.producer || { name: '', email: '' }
  )
  const [cliente, setCliente] = useState(initialData?.cliente || '')
  const [produto, setProduto] = useState(initialData?.produto || '')
  const [midias, setMidias] = useState(initialData?.midias || 'Visualizar')
  const [banco, setBanco] = useState<'shutterstock' | 'getty' | 'personalizado' | ''>(
    initialData?.banco || ''
  )
  const [linksInput, setLinksInput] = useState('')
  const [assets, setAssets] = useState<AssetMetadata[]>(initialData?.assets || [])
  const [isProcessing, setIsProcessing] = useState(false)
  const [observacoes, setObservacoes] = useState(initialData?.observacoes || '')
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualAsset, setManualAsset] = useState({
    type: 'image' as 'video' | 'image',
    id: '',
    title: '',
    pageUrl: '',
    license: 'Licença Padrão',
    price: 0,
    description: ''
  })
  const [uploadingImageFor, setUploadingImageFor] = useState<number | null>(null)

  /**
   * Processa múltiplas URLs (separadas por quebra de linha, vírgula, ponto-e-vírgula ou espaço)
   */
  const processLinks = useCallback(async () => {
    if (!linksInput.trim()) {
      toast({ title: 'Adicione links', description: 'Cole um ou mais links na caixa de texto', variant: 'destructive' })
      return
    }

    // Separar URLs por quebra de linha, vírgula, ponto-e-vírgula ou espaço
    const urls = linksInput
      .split(/[\n,;\s]+/)
      .map(u => u.trim())
      .filter(u => u.startsWith('http'))

    if (urls.length === 0) {
      toast({ title: 'URLs inválidas', description: 'Nenhuma URL válida encontrada', variant: 'destructive' })
      return
    }

    setIsProcessing(true)
    const newAssets: AssetMetadata[] = []
    let detectedBanco: 'shutterstock' | 'getty' | 'personalizado' | '' = banco

    for (const url of urls) {
      try {
        console.log(`[ImageQuickForm] Processing: ${url}`)
        const metadata = await fnGet<AssetMetadata>(`/asset_metadata?url=${encodeURIComponent(url)}`)
        
        // Define a licença escolhida como a recomendada por padrão
        metadata.chosenLicense = metadata.recommendedLicense
        newAssets.push(metadata)
        
        // Detecta automaticamente o banco baseado no provider
        if (!banco) {
          if (metadata.provider.toLowerCase().includes('shutterstock')) {
            detectedBanco = 'shutterstock'
          } else if (metadata.provider.toLowerCase().includes('getty')) {
            detectedBanco = 'getty'
          } else {
            detectedBanco = 'personalizado'
          }
        }
        
        toast({ 
          title: 'Asset adicionado', 
          description: `${metadata.type === 'video' ? 'Vídeo' : 'Imagem'} #${metadata.id || 'sem ID'}` 
        })
      } catch (error: any) {
        console.error('[ImageQuickForm] Error:', error)
        toast({ 
          title: 'Erro ao processar link', 
          description: error.message || 'Não foi possível extrair metadados', 
          variant: 'destructive' 
        })
      }
    }

    // Atualiza o banco se foi detectado automaticamente
    if (detectedBanco && !banco) {
      setBanco(detectedBanco)
      toast({ 
        title: 'Banco detectado', 
        description: `Banco de imagens detectado automaticamente: ${
          detectedBanco === 'shutterstock' ? 'Shutterstock' : 
          detectedBanco === 'getty' ? 'Getty Images' : 
          'Personalizado'
        }` 
      })
    }

    setAssets(prev => [...prev, ...newAssets])
    setLinksInput('')
    setIsProcessing(false)
  }, [linksInput, toast, banco])

  const updateAssetLicense = (index: number, license: string) => {
    setAssets(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], chosenLicense: license }
      return updated
    })
  }

  const updateAssetPrice = (index: number, price: number) => {
    setAssets(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], price }
      return updated
    })
  }

  const updateAssetDescription = (index: number, description: string) => {
    setAssets(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], customDescription: description }
      return updated
    })
  }

  const removeAsset = (index: number) => {
    setAssets(prev => prev.filter((_, i) => i !== index))
  }

  const handleClear = () => {
    setLinksInput('')
    setAssets([])
    setProducer({ name: '', email: '' })
    setCliente('')
    setProduto('')
    setMidias('Visualizar')
    setBanco('')
    setObservacoes('')
  }

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, assetIndex: number) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImageFor(assetIndex)
    
    try {
      // Criar URL temporária para preview
      const url = URL.createObjectURL(file)
      
      // Pedir ID da imagem ao usuário
      const imageId = window.prompt('Qual o ID desta imagem de referência?', assets[assetIndex].id || '')
      
      if (imageId) {
        setAssets(prev => {
          const updated = [...prev]
          updated[assetIndex] = { 
            ...updated[assetIndex], 
            referenciaImageUrl: url,
            referenciaImageId: imageId
          }
          return updated
        })
        
        toast({ 
          title: 'Imagem adicionada', 
          description: `Imagem de referência vinculada ao ID: ${imageId}` 
        })
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error)
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível processar a imagem', 
        variant: 'destructive' 
      })
    } finally {
      setUploadingImageFor(null)
    }
  }

  const addManualAsset = () => {
    if (!manualAsset.title || !manualAsset.pageUrl) {
      toast({ title: 'Dados incompletos', description: 'Preencha título e URL do asset', variant: 'destructive' })
      return
    }

    const licenseOptions = manualAsset.type === 'video' 
      ? ['Licença de vídeo HD', 'Licença Premier de vídeo em 4K']
      : ['Licença Padrão', 'Licença Ampliada (recomendada)']

    const newAsset: AssetMetadata = {
      provider: banco || 'personalizado',
      type: manualAsset.type,
      id: manualAsset.id || null,
      title: manualAsset.title,
      pageUrl: manualAsset.pageUrl,
      thumbnail: null,
      licenseOptions,
      recommendedLicense: manualAsset.license,
      chosenLicense: manualAsset.license,
      price: manualAsset.price,
      customDescription: manualAsset.description,
      isManual: true
    }

    setAssets(prev => [...prev, newAsset])
    setShowManualForm(false)
    setManualAsset({
      type: 'image',
      id: '',
      title: '',
      pageUrl: '',
      license: 'Licença Padrão',
      price: 0,
      description: ''
    })
    toast({ title: 'Asset adicionado', description: 'Asset adicionado manualmente com sucesso' })
  }

  const handleSubmit = () => {
    if (!producer.name || !producer.email) {
      toast({ title: 'Dados incompletos', description: 'Preencha nome e e-mail do produtor', variant: 'destructive' })
      return
    }

    if (!cliente || !produto) {
      toast({ title: 'Dados incompletos', description: 'Selecione cliente e produto', variant: 'destructive' })
      return
    }

    if (assets.length === 0) {
      toast({ title: 'Sem assets', description: 'Adicione pelo menos um asset', variant: 'destructive' })
      return
    }

    // Se o banco não foi definido, usa 'personalizado' como padrão
    const finalBanco = banco || 'personalizado'

    // Calcular total
    const total = assets.reduce((sum, asset) => sum + (asset.price || 0), 0)

    onSave({ producer, cliente, produto, midias, banco: finalBanco, assets, observacoes })
    toast({ 
      title: 'Salvo!', 
      description: `${assets.length} asset(s) adicionado(s). Total: R$ ${total.toFixed(2)}` 
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Coluna A: Dados básicos */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do Orçamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="producer-name">Nome do Produtor *</Label>
              <Input
                id="producer-name"
                value={producer.name}
                onChange={(e) => setProducer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="producer-email">E-mail *</Label>
              <Input
                id="producer-email"
                type="email"
                value={producer.email}
                onChange={(e) => setProducer(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <ClientProductAutocomplete
                type="client"
                value={cliente}
                onChange={setCliente}
                label="Cliente *"
                required
              />
            </div>
            <div>
              <ClientProductAutocomplete
                type="product"
                value={produto}
                onChange={setProduto}
                label="Produto *"
                required
                clientId={cliente}
              />
            </div>
            <div>
              <Label htmlFor="midias">Mídias *</Label>
              <Select value={midias} onValueChange={setMidias}>
                <SelectTrigger id="midias">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visualizar">Visualizar</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="banco">Banco de Imagens</Label>
              <Select value={banco} onValueChange={(value: any) => setBanco(value)}>
                <SelectTrigger id="banco">
                  <SelectValue placeholder="Detectado automaticamente ao adicionar links" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shutterstock">Shutterstock</SelectItem>
                  <SelectItem value="getty">Getty Images</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {banco && (
                <p className="text-xs text-muted-foreground mt-1">
                  Banco: {banco === 'shutterstock' ? 'Shutterstock' : banco === 'getty' ? 'Getty Images' : 'Personalizado'}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                rows={4}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Adicione observações sobre o orçamento..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Opcional: Informações adicionais sobre o orçamento
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links de Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="links-input">Cole um ou mais links (um por linha)</Label>
              <Textarea
                id="links-input"
                rows={6}
                value={linksInput}
                onChange={(e) => setLinksInput(e.target.value)}
                placeholder="https://www.shutterstock.com/video/clip-1234567&#10;https://www.shutterstock.com/image-photo-..."
                className="font-mono text-sm"
              />
            </div>

            <Alert className="border-blue-500/20 bg-blue-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Dica:</strong> Cole múltiplas URLs separadas por quebra de linha, vírgula ou ponto-e-vírgula. O banco de imagens será detectado automaticamente.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={processLinks}
                disabled={isProcessing || !linksInput.trim()}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar links
                  </>
                )}
              </Button>
              <Button onClick={handleClear} variant="outline">
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar Asset Manualmente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showManualForm ? (
              <Button onClick={() => setShowManualForm(true)} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar asset sem link
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={manualAsset.type} onValueChange={(value: 'video' | 'image') => setManualAsset(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Imagem</SelectItem>
                      <SelectItem value="video">Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="manual-id">ID do Asset (opcional)</Label>
                  <Input
                    id="manual-id"
                    value={manualAsset.id}
                    onChange={(e) => setManualAsset(prev => ({ ...prev, id: e.target.value }))}
                    placeholder="Ex: 1234567"
                  />
                </div>
                <div>
                  <Label htmlFor="manual-title">Título *</Label>
                  <Input
                    id="manual-title"
                    value={manualAsset.title}
                    onChange={(e) => setManualAsset(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nome ou descrição do asset"
                  />
                </div>
                <div>
                  <Label htmlFor="manual-url">URL *</Label>
                  <Input
                    id="manual-url"
                    value={manualAsset.pageUrl}
                    onChange={(e) => setManualAsset(prev => ({ ...prev, pageUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="manual-license">Licença</Label>
                  <Input
                    id="manual-license"
                    value={manualAsset.license}
                    onChange={(e) => setManualAsset(prev => ({ ...prev, license: e.target.value }))}
                    placeholder="Ex: Licença Padrão"
                  />
                </div>
                <div>
                  <Label htmlFor="manual-price">Custo (R$)</Label>
                  <Input
                    id="manual-price"
                    type="number"
                    step="0.01"
                    value={manualAsset.price}
                    onChange={(e) => setManualAsset(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="manual-description">Descrição</Label>
                  <Textarea
                    id="manual-description"
                    rows={3}
                    value={manualAsset.description}
                    onChange={(e) => setManualAsset(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição detalhada do asset"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={addManualAsset} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                  <Button onClick={() => setShowManualForm(false)} variant="outline">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coluna B: Itens processados */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Assets Adicionados ({assets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum asset adicionado ainda.</p>
                <p className="text-sm">Cole os links à esquerda e clique em "Adicionar links".</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assets.map((asset, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      {asset.thumbnail ? (
                        <img
                          src={asset.thumbnail}
                          alt={asset.title || 'Asset'}
                          className="w-20 h-20 rounded object-cover bg-background"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          Sem preview
                        </div>
                      )}

                      {/* Metadados */}
                      <div className="flex-1 space-y-1 text-sm">
                        <p className="font-semibold line-clamp-2">{asset.title || 'Sem título'}</p>
                        <p className="text-muted-foreground">
                          <span className="capitalize">{asset.type}</span>
                          {asset.id && ` • ID: ${asset.id}`}
                          {asset.provider && ` • ${asset.provider}`}
                        </p>
                        {asset.durationSeconds && (
                          <p className="text-muted-foreground">
                            Duração: {formatDuration(asset.durationSeconds)}
                          </p>
                        )}
                        {asset.resolution && (
                          <p className="text-muted-foreground">
                            Resolução: {asset.resolution.width}×{asset.resolution.height}
                          </p>
                        )}
                      </div>

                      {/* Botão remover */}
                      <Button
                        onClick={() => removeAsset(index)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Seletor de licença */}
                    <div>
                      <Label>Tipo de Licença</Label>
                      <Select
                        value={asset.chosenLicense}
                        onValueChange={(value) => updateAssetLicense(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {asset.licenseOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                              {option === asset.recommendedLicense && ' ⭐'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custo */}
                    <div>
                      <Label htmlFor={`price-${index}`}>Custo (R$)</Label>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={asset.price || ''}
                        onChange={(e) => updateAssetPrice(index, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>

                    {/* Descrição customizável */}
                    <div>
                      <Label htmlFor={`description-${index}`}>Descrição</Label>
                      <Textarea
                        id={`description-${index}`}
                        rows={2}
                        value={asset.customDescription || asset.title || ''}
                        onChange={(e) => updateAssetDescription(index, e.target.value)}
                        placeholder="Descrição do asset"
                      />
                    </div>

                    {/* Imagem de Referência */}
                    <div>
                      <Label htmlFor={`ref-image-${index}`}>Imagem de Referência</Label>
                      <Input
                        id={`ref-image-${index}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileChange(e, index)}
                        className="cursor-pointer"
                        disabled={uploadingImageFor === index}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {uploadingImageFor === index 
                          ? 'Processando...' 
                          : 'Adicione uma imagem de referência para este asset'}
                      </p>
                      {asset.referenciaImageUrl && (
                        <div className="mt-2 space-y-1">
                          <img 
                            src={asset.referenciaImageUrl} 
                            alt="Referência"
                            className="max-h-24 rounded border"
                          />
                          {asset.referenciaImageId && (
                            <p className="text-xs text-muted-foreground">
                              ID vinculado: {asset.referenciaImageId}
                              {asset.id === asset.referenciaImageId && (
                                <span className="ml-2 text-green-600 font-semibold">✓ Correspondente</span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Link para abrir */}
                    <a
                      href={asset.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir no provedor
                    </a>
                  </div>
                ))}
              </div>
            )}

            {assets.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span>
                      R$ {assets.reduce((sum, asset) => sum + (asset.price || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Soma de {assets.length} asset(s)
                  </p>
                </div>
                <Button onClick={handleSubmit} className="w-full" size="lg">
                  Usar no orçamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

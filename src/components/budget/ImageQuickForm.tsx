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
}

interface Producer {
  name: string
  email: string
}

interface ImageQuickFormProps {
  onSave: (data: { producer: Producer; assets: AssetMetadata[] }) => void
  initialData?: { producer?: Producer; assets?: AssetMetadata[] }
}

export function ImageQuickForm({ onSave, initialData }: ImageQuickFormProps) {
  const { toast } = useToast()
  const [producer, setProducer] = useState<Producer>(
    initialData?.producer || { name: '', email: '' }
  )
  const [linksInput, setLinksInput] = useState('')
  const [assets, setAssets] = useState<AssetMetadata[]>(initialData?.assets || [])
  const [isProcessing, setIsProcessing] = useState(false)

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

    for (const url of urls) {
      try {
        console.log(`[ImageQuickForm] Processing: ${url}`)
        const metadata = await fnGet<AssetMetadata>(`/asset_metadata?url=${encodeURIComponent(url)}`)
        
        // Define a licença escolhida como a recomendada por padrão
        metadata.chosenLicense = metadata.recommendedLicense
        newAssets.push(metadata)
        
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

    setAssets(prev => [...prev, ...newAssets])
    setLinksInput('')
    setIsProcessing(false)
  }, [linksInput, toast])

  const updateAssetLicense = (index: number, license: string) => {
    setAssets(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], chosenLicense: license }
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
  }

  const handleSubmit = () => {
    if (!producer.name || !producer.email) {
      toast({ title: 'Dados incompletos', description: 'Preencha nome e e-mail do produtor', variant: 'destructive' })
      return
    }

    if (assets.length === 0) {
      toast({ title: 'Sem assets', description: 'Adicione pelo menos um asset', variant: 'destructive' })
      return
    }

    onSave({ producer, assets })
    toast({ title: 'Salvo!', description: `${assets.length} asset(s) adicionado(s) ao orçamento` })
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
            <CardTitle>Dados do Produtor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="producer-name">Nome do Produtor</Label>
              <Input
                id="producer-name"
                value={producer.name}
                onChange={(e) => setProducer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="producer-email">E-mail</Label>
              <Input
                id="producer-email"
                type="email"
                value={producer.email}
                onChange={(e) => setProducer(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
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
                <strong>Dica:</strong> Cole múltiplas URLs separadas por quebra de linha, vírgula ou ponto-e-vírgula.
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
              <Button onClick={handleSubmit} className="w-full mt-6" size="lg">
                Usar no orçamento
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

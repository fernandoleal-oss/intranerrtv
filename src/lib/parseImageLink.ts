export type ParsedImage = {
  provider: 'shutterstock' | 'getty' | 'outro'
  type: 'asset' | 'collection' | 'desconhecido'
  id?: string
  title?: string
  description?: string
  thumb?: string
  canonical?: string
  requiresAssetLink?: boolean
}

export async function parseImageLink(url: string): Promise<ParsedImage> {
  try {
    const u = new URL(url)
    const host = u.hostname
    
    // For demo purposes, we'll simulate the parsing
    // In a real app, this would fetch the HTML and parse meta tags
    const out: ParsedImage = { provider: 'outro', type: 'desconhecido' }

    // Shutterstock
    if (host.includes('shutterstock.com')) {
      out.provider = 'shutterstock'
      const isCollection = /collections|featured-collections/i.test(u.pathname)
      
      if (isCollection) {
        out.type = 'collection'
        out.requiresAssetLink = true
        out.title = 'Coleção do Shutterstock'
        out.description = 'Este é um link de coleção. Abra a imagem específica e copie o link do asset.'
      } else {
        out.type = 'asset'
        const idMatch = u.pathname.match(/-(?:id-)?(\d{6,})$/i) || u.pathname.match(/-(\d{6,})/i)
        out.id = idMatch?.[1] || 'N/A'
        out.title = `Imagem Shutterstock ${out.id}`
        out.description = 'Imagem do Shutterstock - ajuste o resumo conforme necessário'
        out.thumb = 'https://image.shutterstock.com/image-photo/placeholder-600w-300h.jpg'
      }
      out.canonical = url
      return out
    }

    // Getty Images
    if (host.includes('gettyimages')) {
      out.provider = 'getty'
      const isGallery = /photos|collections/i.test(u.pathname) && !/photo\//i.test(u.pathname)
      
      if (isGallery) {
        out.type = 'collection'
        out.requiresAssetLink = true
        out.title = 'Galeria Getty Images'
        out.description = 'Este é um link de galeria. Abra a imagem específica e copie o link do asset.'
      } else {
        out.type = 'asset'
        const idMatch = u.pathname.match(/-id(\d+)/i)
        out.id = idMatch?.[1] || 'N/A'
        out.title = `Imagem Getty ${out.id}`
        out.description = 'Imagem do Getty Images - ajuste o resumo conforme necessário'
        out.thumb = 'https://via.placeholder.com/300x200/f0f0f0/666?text=Getty+Image'
      }
      out.canonical = url
      return out
    }

    // Generic/Unknown provider
    out.title = 'Imagem personalizada'
    out.description = 'Preencha manualmente os detalhes desta imagem'
    out.canonical = url
    return out
    
  } catch (error) {
    console.error('Error parsing image link:', error)
    return {
      provider: 'outro',
      type: 'desconhecido',
      title: 'URL inválida',
      description: 'Verifique se o link está correto',
      canonical: url
    }
  }
}
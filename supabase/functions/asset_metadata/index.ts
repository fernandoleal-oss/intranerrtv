// Edge Function: asset_metadata
// Extrai metadados de assets (Shutterstock, etc.) a partir de URLs

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
}

/**
 * Detecta o provedor e tipo de asset a partir da URL
 */
function detectProvider(url: string): { provider: string; type: 'video' | 'image' | 'unknown'; id: string | null } {
  const lowerUrl = url.toLowerCase()
  
  // Shutterstock Video: /video/clip-<id>
  const videoMatch = url.match(/\/video\/clip-(\d+)/)
  if (videoMatch) {
    return { provider: 'shutterstock', type: 'video', id: videoMatch[1] }
  }
  
  // Shutterstock Image: /image-photo-... ou /image-vector-... ou /image-illustration-...-id-<id>
  const imageMatch = url.match(/\/image-(?:photo|vector|illustration).*?-(\d+)/)
  if (imageMatch) {
    return { provider: 'shutterstock', type: 'image', id: imageMatch[1] }
  }
  
  // Fallback genérico
  if (lowerUrl.includes('shutterstock')) {
    return { provider: 'shutterstock', type: 'unknown', id: null }
  }
  
  return { provider: 'unknown', type: 'unknown', id: null }
}

/**
 * Converte duração ISO 8601 (PT1M30S) em segundos
 */
function parseDuration(isoDuration?: string): number | undefined {
  if (!isoDuration) return undefined
  
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/)
  if (!match) return undefined
  
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseFloat(match[3] || '0')
  
  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Extrai resolução de uma string de dimensões (ex: "3840x2160")
 */
function parseResolution(dimStr?: string): { width: number; height: number } | null {
  if (!dimStr) return null
  const match = dimStr.match(/(\d+)\s*[x×]\s*(\d+)/)
  if (!match) return null
  return { width: parseInt(match[1]), height: parseInt(match[2]) }
}

/**
 * Determina opções e recomendação de licença
 */
function getLicenseInfo(type: string, resolution?: { width: number; height: number } | null): {
  licenseOptions: string[]
  recommendedLicense: string
} {
  if (type === 'video') {
    const options = ['Licença de vídeo HD', 'Licença Premier de vídeo em 4K']
    const recommended = (resolution && resolution.width >= 3840)
      ? 'Licença Premier de vídeo em 4K'
      : 'Licença de vídeo HD'
    return { licenseOptions: options, recommendedLicense: recommended }
  }
  
  if (type === 'image') {
    const options = ['Licença Padrão', 'Licença Ampliada (recomendada)']
    return { licenseOptions: options, recommendedLicense: 'Licença Ampliada (recomendada)' }
  }
  
  // Fallback
  return { licenseOptions: ['Licença Padrão'], recommendedLicense: 'Licença Padrão' }
}

/**
 * Faz scraping do HTML e extrai metadados (JSON-LD + Open Graph)
 */
async function extractMetadata(url: string): Promise<AssetMetadata> {
  const detection = detectProvider(url)
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    
    // Extrair JSON-LD
    let jsonLd: any = null
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
    if (jsonLdMatch) {
      try {
        jsonLd = JSON.parse(jsonLdMatch[1])
      } catch {
        console.log('Failed to parse JSON-LD')
      }
    }
    
    // Extrair Open Graph tags
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
    const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
    
    // Montar metadados
    const title = jsonLd?.name || ogTitle || ogDescription || null
    const thumbnail = ogImage || jsonLd?.thumbnailUrl || null
    const durationSeconds = parseDuration(jsonLd?.duration)
    
    // Tentar extrair resolução do og:image (às vezes tem dimensões na URL)
    let resolution: { width: number; height: number } | null = null
    if (ogImage) {
      const resMatch = ogImage.match(/(\d+)x(\d+)/)
      if (resMatch) {
        resolution = { width: parseInt(resMatch[1]), height: parseInt(resMatch[2]) }
      }
    }
    
    // Se não conseguiu resolução, tentar do JSON-LD
    if (!resolution && jsonLd?.width && jsonLd?.height) {
      resolution = { width: parseInt(jsonLd.width), height: parseInt(jsonLd.height) }
    }
    
    const licenseInfo = getLicenseInfo(detection.type, resolution)
    
    return {
      provider: detection.provider,
      type: detection.type,
      id: detection.id || jsonLd?.identifier || jsonLd?.sku || null,
      title,
      durationSeconds,
      resolution,
      thumbnail,
      licenseOptions: licenseInfo.licenseOptions,
      recommendedLicense: licenseInfo.recommendedLicense,
      pageUrl: url,
    }
  } catch (error: any) {
    console.error('Error extracting metadata:', error)
    
    // Fallback: retornar dados básicos
    const licenseInfo = getLicenseInfo(detection.type, null)
    return {
      provider: detection.provider,
      type: detection.type,
      id: detection.id,
      title: url,
      thumbnail: null,
      licenseOptions: licenseInfo.licenseOptions,
      recommendedLicense: licenseInfo.recommendedLicense,
      pageUrl: url,
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const url = new URL(req.url)
    const targetUrl = url.searchParams.get('url')
    
    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing ?url parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`[asset_metadata] Processing URL: ${targetUrl}`)
    
    const metadata = await extractMetadata(targetUrl)
    
    console.log(`[asset_metadata] Extracted:`, JSON.stringify(metadata, null, 2))
    
    return new Response(
      JSON.stringify(metadata),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[asset_metadata] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

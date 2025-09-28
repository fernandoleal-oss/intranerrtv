export interface ParsedImageLink {
  provider: string;
  type: 'asset' | 'collection' | 'unknown';
  id?: string;
  requiresAssetLink?: boolean;
}

export function parseImageLink(url: string): ParsedImageLink {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    if (hostname.includes('shutterstock')) {
      // Check if it's a collection URL
      if (/collections|featured-collections/i.test(pathname)) {
        return {
          provider: 'shutterstock',
          type: 'collection',
          requiresAssetLink: true
        };
      }
      
      // Extract asset ID from Shutterstock URL
      const idMatch = pathname.match(/-(?:id-)?(\d{6,})$/i);
      return {
        provider: 'shutterstock',
        type: 'asset',
        id: idMatch?.[1]
      };
    }
    
    if (hostname.includes('gettyimages')) {
      // Check if it's a collection URL
      if (/photos|collections/i.test(pathname) && !/photo\//i.test(pathname)) {
        return {
          provider: 'getty',
          type: 'collection',
          requiresAssetLink: true
        };
      }
      
      // Extract asset ID from Getty URL
      const idMatch = pathname.match(/-id(\d+)/i);
      return {
        provider: 'getty',
        type: 'asset',
        id: idMatch?.[1]
      };
    }
    
    return {
      provider: 'outro',
      type: 'unknown'
    };
  } catch {
    return {
      provider: 'outro',
      type: 'unknown'
    };
  }
}
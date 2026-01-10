import sharp from 'sharp'

export interface ImageSize {
  name: string
  width: number
  height?: number
  quality?: number
}

export interface ProcessedImage {
  buffer: Buffer
  format: 'webp' | 'jpeg' | 'png'
  width: number
  height: number
  size: number
}

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png' | 'auto'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  background?: { r: number; g: number; b: number; alpha?: number }
}

export interface ThumbnailOptions {
  sizes: ImageSize[]
  format?: 'webp' | 'jpeg'
  quality?: number
}

const DEFAULT_SIZES: ImageSize[] = [
  { name: 'sm', width: 150, quality: 80 },
  { name: 'md', width: 400, quality: 85 },
  { name: 'lg', width: 800, quality: 90 },
  { name: 'xl', width: 1200, quality: 90 },
]

export async function processImage(
  input: Buffer | Uint8Array,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 1200,
    maxHeight,
    quality = 85,
    format = 'auto',
    fit = 'inside',
    background = { r: 255, g: 255, b: 255, alpha: 1 },
  } = options

  let pipeline = sharp(input)
  const metadata = await pipeline.metadata()

  // Resize if needed
  if (maxWidth || maxHeight) {
    pipeline = pipeline.resize({
      width: maxWidth,
      height: maxHeight,
      fit,
      background,
      withoutEnlargement: true,
    })
  }

  // Auto-rotate based on EXIF
  pipeline = pipeline.rotate()

  // Determine output format
  let outputFormat: 'webp' | 'jpeg' | 'png' = 'webp'
  if (format !== 'auto') {
    outputFormat = format
  } else if (metadata.hasAlpha) {
    outputFormat = 'webp' // WebP supports transparency
  }

  // Apply format-specific settings
  switch (outputFormat) {
    case 'webp':
      pipeline = pipeline.webp({ quality, effort: 4 })
      break
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true })
      break
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9, palette: true })
      break
  }

  const outputBuffer = await pipeline.toBuffer()
  const outputMetadata = await sharp(outputBuffer).metadata()

  return {
    buffer: outputBuffer,
    format: outputFormat,
    width: outputMetadata.width || 0,
    height: outputMetadata.height || 0,
    size: outputBuffer.length,
  }
}

export async function generateThumbnails(
  input: Buffer | Uint8Array,
  options: ThumbnailOptions = { sizes: DEFAULT_SIZES }
): Promise<Map<string, ProcessedImage>> {
  const { sizes = DEFAULT_SIZES, format = 'webp', quality = 85 } = options
  const results = new Map<string, ProcessedImage>()

  for (const size of sizes) {
    const processed = await processImage(input, {
      maxWidth: size.width,
      maxHeight: size.height,
      quality: size.quality || quality,
      format,
      fit: 'inside',
    })
    results.set(size.name, processed)
  }

  return results
}

export async function getImageMetadata(input: Buffer | Uint8Array): Promise<{
  width: number
  height: number
  format: string
  hasAlpha: boolean
  size: number
}> {
  const metadata = await sharp(input).metadata()
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    hasAlpha: metadata.hasAlpha || false,
    size: input.length,
  }
}

export async function convertToWebP(
  input: Buffer | Uint8Array,
  quality: number = 85
): Promise<ProcessedImage> {
  return processImage(input, { format: 'webp', quality })
}

export async function resizeImage(
  input: Buffer | Uint8Array,
  width: number,
  height?: number
): Promise<ProcessedImage> {
  return processImage(input, { maxWidth: width, maxHeight: height })
}

export async function cropToSquare(
  input: Buffer | Uint8Array,
  size: number = 400
): Promise<ProcessedImage> {
  const pipeline = sharp(input)
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 85 })

  const buffer = await pipeline.toBuffer()
  const metadata = await sharp(buffer).metadata()

  return {
    buffer,
    format: 'webp',
    width: metadata.width || size,
    height: metadata.height || size,
    size: buffer.length,
  }
}

export async function addWatermark(
  input: Buffer | Uint8Array,
  watermarkText: string,
  options: {
    fontSize?: number
    color?: string
    position?: 'center' | 'bottom-right' | 'bottom-left'
    opacity?: number
  } = {}
): Promise<ProcessedImage> {
  const {
    fontSize = 24,
    color = 'rgba(255,255,255,0.5)',
    position = 'bottom-right',
  } = options

  const image = sharp(input)
  const metadata = await image.metadata()
  const width = metadata.width || 800
  const height = metadata.height || 600

  // Calculate position
  let x = 20
  let y = height - 40
  if (position === 'center') {
    x = width / 2
    y = height / 2
  } else if (position === 'bottom-left') {
    x = 20
    y = height - 40
  }

  const svgText = `
    <svg width="${width}" height="${height}">
      <text
        x="${x}"
        y="${y}"
        font-size="${fontSize}"
        fill="${color}"
        font-family="Arial, sans-serif"
      >${watermarkText}</text>
    </svg>
  `

  const buffer = await image
    .composite([{ input: Buffer.from(svgText), gravity: 'southeast' }])
    .webp({ quality: 90 })
    .toBuffer()

  return {
    buffer,
    format: 'webp',
    width,
    height,
    size: buffer.length,
  }
}

export { DEFAULT_SIZES }

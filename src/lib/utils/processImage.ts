import heic2any from 'heic2any'

export interface ProcessImageResult {
  processedFile: File
  previewUrl: string
}

export const processImage = async (file: File): Promise<ProcessImageResult> => {
  try {
    let processedFile = file

    // HEIC 파일 처리
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8,
      })
      processedFile = new File(
        [convertedBlob as Blob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { type: 'image/jpeg' }
      )
    }

    // 미리보기 URL 생성
    const previewUrl = URL.createObjectURL(processedFile)

    return { processedFile, previewUrl }
  } catch (error) {
    console.error('Image processing error:', error)
    throw error
  }
}

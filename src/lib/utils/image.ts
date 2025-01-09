import heic2any from 'heic2any'

export const convertHeicToJpeg = async (file: File): Promise<File> => {
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8,
    })
    return new File([blob as Blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
      type: 'image/jpeg',
    })
  }
  return file
}

export const centerCropImage = (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = Math.min(img.width, img.height)
      canvas.width = size
      canvas.height = size

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // 이미지 중앙을 기준으로 정사각형 크롭
      const offsetX = (img.width - size) / 2
      const offsetY = (img.height - size) / 2

      ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

// * 인스타 공유 이미지 생성에 사용
export const convertAndCropToSquare = async (file: File): Promise<string> => {
  const processedFile = await convertHeicToJpeg(file)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = async () => {
      const imageUrl = reader.result as string
      const croppedImage = await centerCropImage(imageUrl)
      resolve(croppedImage)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(processedFile)
  })
}

// * 프로필 이미지 변경에 사용
export interface convertAndCreatePreviewResult {
  processedFile: File
  previewUrl: string
}

export const convertAndCreatePreview = async (
  file: File
): Promise<convertAndCreatePreviewResult> => {
  try {
    const processedFile = await convertHeicToJpeg(file)

    // 미리보기 URL 생성
    const previewUrl = URL.createObjectURL(processedFile)

    return { processedFile, previewUrl }
  } catch (error) {
    console.error('Image processing error:', error)
    throw error
  }
}

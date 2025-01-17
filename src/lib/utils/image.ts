'use client'

import { logError } from '@/lib/utils/log'
import heic2any from 'heic2any'

/**
 * 이미지를 변환하고 정사각형으로 크롭하여 반환하는 함수
 *
 * @description
 * HEIC/HEIF 변환 및 정사각형 크롭을 순차적으로 수행합니다
 *
 * @param file - 처리할 이미지 파일
 * @returns {Promise<string>} 처리된 이미지의 Data URL
 *
 * @remarks
 * - HEIC/HEIF -> JPEG 변환 수행
 * - 중앙 기준 정사각형 크롭 적용
 * @throws {Error} 파일 읽기 실패 시
 */
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

/**
 * HEIC/HEIF 이미지를 JPEG 형식으로 변환하는 함수
 *
 * @param file - 변환할 이미지 파일
 * @returns {Promise<File>} 변환된 JPEG 파일 또는 원본 파일
 *
 * @remarks
 * - HEIC/HEIF 형식이 아닌 경우 원본 파일을 그대로 반환
 * - 변환 시 품질은 0.8로 설정
 * - 파일 확장자를 .jpg로 변경
 */
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

/**
 * 이미지를 중앙 기준으로 정사각형으로 크롭하는 함수
 *
 * @param imageUrl - 크롭할 이미지의 URL 또는 Data URL
 * @returns {Promise<string>} 크롭된 이미지의 Data URL
 *
 * @remarks
 * - 이미지의 가로/세로 중 작은 값을 기준으로 정사각형 크롭
 * - 결과 이미지는 JPEG 형식, 품질 0.8로 변환
 */
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

/**
 * 프로필 이미지 변환 처리 및 미리보기 URL을 생성하는 함수
 *
 * @description
 * 이미지 변환 처리 및 미리보기 URL 생성을 동시에 수행합니다
 *
 * @param file - 처리할 이미지 파일
 * @returns {Promise<convertAndCreatePreviewResult>} 처리된 파일과 미리보기 URL
 *
 * @remarks
 * - HEIC/HEIF -> JPEG 변환 수행
 * - 브라우저 메모리에 미리보기 URL 생성
 * - 사용 후 메모리 정리를 위해 미리보기 URL revoke 필요
 */
export interface convertAndCreatePreviewResult {
  processedFile: File
  previewUrl: string
}

export const convertAndCreatePreview = async (
  file: File
): Promise<convertAndCreatePreviewResult> => {
  try {
    const processedFile = await convertHeicToJpeg(file)

    const previewUrl = URL.createObjectURL(processedFile)

    return { processedFile, previewUrl }
  } catch (error) {
    logError('이미지 변환 에러', {
      error,
      functionName: 'convertAndCreatePreview',
    })
    throw error
  }
}

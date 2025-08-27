'use client'

import React from 'react'
import { useStravaStreamsQuery } from '@/hooks/activities/api/useStravaStreamsQuery'
import { StravaStreamsResponse } from '@/lib/types/strava'

interface ActivityStreamsDisplayProps {
  activityId: number
  keys?: string[]
  className?: string
}

/**
 * 스트라바 액티비티의 스트림 데이터를 표시하는 컴포넌트
 * 
 * @param activityId - 스트라바 액티비티 ID
 * @param keys - 표시할 스트림 데이터 키들
 * @param className - 추가 CSS 클래스
 */
export const ActivityStreamsDisplay: React.FC<ActivityStreamsDisplayProps> = ({
  activityId,
  keys = ['distance', 'time', 'latlng', 'altitude', 'velocity_smooth', 'heartrate', 'cadence', 'watts', 'grade_smooth'],
  className = ''
}) => {
  // 스트림 데이터 쿼리
  const {
    data: streamsData,
    isLoading,
    error,
    isError
  } = useStravaStreamsQuery(activityId, keys)

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  // 오류 상태
  if (isError) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <p className="text-red-600 text-sm">
          스트림 데이터를 불러오는 중 오류가 발생했습니다: {error?.message}
        </p>
      </div>
    )
  }

  // 데이터가 없는 경우
  if (!streamsData) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500 text-sm">스트림 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">활동 상세 데이터</h3>
      
      {/* 거리 데이터 */}
      {streamsData.distance && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">거리 (미터)</h4>
          <div className="text-sm text-blue-700">
            <p>총 데이터 포인트: {streamsData.distance.data.length}</p>
            <p>해상도: {streamsData.distance.resolution}</p>
            <p>최대 거리: {Math.max(...streamsData.distance.data).toFixed(2)}m</p>
          </div>
        </div>
      )}

      {/* 시간 데이터 */}
      {streamsData.time && (
        <div className="p-3 bg-green-50 rounded-lg">
          <h4 className="font-medium text-green-900 mb-2">시간 (초)</h4>
          <div className="text-sm text-green-700">
            <p>총 데이터 포인트: {streamsData.time.data.length}</p>
            <p>총 시간: {(streamsData.time.data[streamsData.time.data.length - 1] / 60).toFixed(1)}분</p>
          </div>
        </div>
      )}

      {/* 고도 데이터 */}
      {streamsData.altitude && (
        <div className="p-3 bg-purple-50 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-2">고도 (미터)</h4>
          <div className="text-sm text-purple-700">
            <p>총 데이터 포인트: {streamsData.altitude.data.length}</p>
            <p>최대 고도: {Math.max(...streamsData.altitude.data).toFixed(1)}m</p>
            <p>최소 고도: {Math.min(...streamsData.altitude.data).toFixed(1)}m</p>
          </div>
        </div>
      )}

      {/* 심박수 데이터 */}
      {streamsData.heartrate && (
        <div className="p-3 bg-red-50 rounded-lg">
          <h4 className="font-medium text-red-900 mb-2">심박수 (BPM)</h4>
          <div className="text-sm text-red-700">
            <p>총 데이터 포인트: {streamsData.heartrate.data.length}</p>
            <p>최대 심박수: {Math.max(...streamsData.heartrate.data)} BPM</p>
            <p>평균 심박수: {(streamsData.heartrate.data.reduce((a, b) => a + b, 0) / streamsData.heartrate.data.length).toFixed(0)} BPM</p>
          </div>
        </div>
      )}

      {/* 캐던스 데이터 */}
      {streamsData.cadence && (
        <div className="p-3 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-2">캐던스 (RPM)</h4>
          <div className="text-sm text-yellow-700">
            <p>총 데이터 포인트: {streamsData.cadence.data.length}</p>
            <p>최대 캐던스: {Math.max(...streamsData.cadence.data)} RPM</p>
            <p>평균 캐던스: {(streamsData.cadence.data.reduce((a, b) => a + b, 0) / streamsData.cadence.data.length).toFixed(0)} RPM</p>
          </div>
        </div>
      )}

      {/* 파워 데이터 */}
      {streamsData.watts && (
        <div className="p-3 bg-orange-50 rounded-lg">
          <h4 className="font-medium text-orange-900 mb-2">파워 (와트)</h4>
          <div className="text-sm text-orange-700">
            <p>총 데이터 포인트: {streamsData.watts.data.length}</p>
            <p>최대 파워: {Math.max(...streamsData.watts.data)}W</p>
            <p>평균 파워: {(streamsData.watts.data.reduce((a, b) => a + b, 0) / streamsData.watts.data.length).toFixed(0)}W</p>
          </div>
        </div>
      )}

      {/* 속도 데이터 */}
      {streamsData.velocity_smooth && (
        <div className="p-3 bg-indigo-50 rounded-lg">
          <h4 className="font-medium text-indigo-900 mb-2">속도 (m/s)</h4>
          <div className="text-sm text-indigo-700">
            <p>총 데이터 포인트: {streamsData.velocity_smooth.data.length}</p>
            <p>최대 속도: {(Math.max(...streamsData.velocity_smooth.data) * 3.6).toFixed(1)} km/h</p>
            <p>평균 속도: {(streamsData.velocity_smooth.data.reduce((a, b) => a + b, 0) / streamsData.velocity_smooth.data.length * 3.6).toFixed(1)} km/h</p>
          </div>
        </div>
      )}

      {/* 경사 데이터 */}
      {streamsData.grade_smooth && (
        <div className="p-3 bg-teal-50 rounded-lg">
          <h4 className="font-medium text-teal-900 mb-2">경사 (%)</h4>
          <div className="text-sm text-teal-700">
            <p>총 데이터 포인트: {streamsData.grade_smooth.data.length}</p>
            <p>최대 경사: {Math.max(...streamsData.grade_smooth.data).toFixed(1)}%</p>
            <p>최소 경사: {Math.min(...streamsData.grade_smooth.data).toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* 좌표 데이터 */}
      {streamsData.latlng && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">GPS 좌표</h4>
          <div className="text-sm text-gray-700">
            <p>총 데이터 포인트: {streamsData.latlng.data.length}</p>
            <p>좌표 형식: [위도, 경도]</p>
            <p>첫 번째 좌표: [{streamsData.latlng.data[0]?.toFixed(6)}, {streamsData.latlng.data[1]?.toFixed(6)}]</p>
          </div>
        </div>
      )}
    </div>
  )
}

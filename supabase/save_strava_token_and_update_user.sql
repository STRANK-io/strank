CREATE OR REPLACE FUNCTION save_strava_token_and_update_user(
  p_strava_athlete_id bigint,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamp with time zone
) RETURNS text AS $$
DECLARE
  v_user_id uuid;
  v_existing_token record;
BEGIN
  -- 현재 인증된 사용자 ID 가져오기
  v_user_id := auth.uid();
  
  -- 사용자 ID가 없으면 오류 반환
  IF v_user_id IS NULL THEN
    RETURN 'AUTH_REQUIRED';
  END IF;
  
  -- 이미 해당 스트라바 계정이 다른 사용자와 연동되어 있는지 확인
  SELECT * INTO v_existing_token 
  FROM public.strava_user_tokens 
  WHERE strava_athlete_id = p_strava_athlete_id 
    AND user_id != v_user_id
    AND deleted_at IS NULL;
    
  -- 이미 다른 사용자와 연동된 스트라바 계정인 경우
  IF v_existing_token.user_id IS NOT NULL THEN
    RETURN 'ALREADY_CONNECTED';
  END IF;
  
  -- 트랜잭션 시작
  BEGIN
    -- 스트라바 토큰 저장
    INSERT INTO public.strava_user_tokens (
      user_id,
      strava_athlete_id,
      access_token,
      refresh_token,
      expires_at
    ) VALUES (
      v_user_id,
      p_strava_athlete_id,
      p_access_token,
      p_refresh_token,
      p_expires_at
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      strava_athlete_id = EXCLUDED.strava_athlete_id,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      expires_at = EXCLUDED.expires_at,
      deleted_at = NULL;
    
    -- users 테이블의 strava_connected_at 업데이트
    UPDATE public.users
    SET strava_connected_at = NOW()
    WHERE id = v_user_id;
    
    -- 성공 결과 반환
    RETURN 'SUCCESS';
    
    EXCEPTION WHEN OTHERS THEN
      -- 오류 발생 시 간단한 에러 코드 반환
      RETURN 'DB_ERROR';
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
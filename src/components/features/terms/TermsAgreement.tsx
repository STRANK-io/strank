import type { ReactNode } from 'react'

interface TermsSectionProps {
  title: string
  children: ReactNode
}

function TermsSection({ title, children }: TermsSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold leading-[21px]">{title}</h2>
      <div className="flex flex-col gap-3 text-sm font-normal leading-[18px]">{children}</div>
    </div>
  )
}

export default function TermsAgreement() {
  return (
    <div className="flex flex-col gap-6 px-5 text-brand-dark">
      <TermsSection title="스트랭크 이용관련 안내고지">
        <p>
          1. 스트랭크는 라이더의 모든 순간을 함께하며 라이더에게 동기부여와 즐거움을 주는 정보를
          제공하여 그들이 더욱 행복할 수 있도록 만들어 갑니다.
          <br />
          <br />
          2. 스트랭크는 현재 베타 서비스를 진행하고 있으므로 이용자의 정보는 삭제되거나 변경될 수
          있습니다.
          <br />
          <br />
          3. 스트랭크의 베타 서비스 기간 중에는 일부 기능이 오작동하거나 미비할 수 있으며, 서비스
          오류로 인한 사항에 대해서 보상의 의무가 없습니다.
          <br />
          <br />
          4. 스트랭크의 서비스는 예고없이 중단되거나 정지될 수 있습니다.
          <br />
          <br />
          5. 스트랭크가 제공하는 모든 서비스에서 이용자는 비속어, 사회통념상 모욕감 혹은 불쾌감을
          유발할 가능성이 있는 모든 문구 및 활동 등을 금지하며 스트랭크는 이에 대한 제재를 할 수
          있습니다. 또한, 이로 발생하는 모든 문제는 이용자에게 있습니다.
        </p>
      </TermsSection>

      <TermsSection title="스트랭크에 대한 개인정보 취급방침">
        1. 개인정보의 수집목적 및 이용
        <br />
        스트랭크가 개인의 정보를 수집하는 목적은 스트랭크 서비스의 모든 컨텐츠를 제공함에 있어
        유용한 정보를 제공하는 것에 목적이 있습니다.
        <br />
        <br />
        2. 수집하는 개인정보 항목 및 수집방법
        <br />
        스트랭크는 최초 가입 시, 필수적인 정보만을 요청하여 수집하고 있습니다.
        <br />
        가입 시에 받는 제공 받는 정보는 아래와 같으며, 서비스 필요에 따라 추가적인 정보제공을 요청할
        수 있습니다.
        <br />
        -제공 받는 정보 : 아이디, 비밀번호, 닉네임, 이메일, 위치기반 정보
        <br />
        <br />
        3. 스트랭크는 스트라바의 서비스를 활용하여 일부 콘텐츠를 제공합니다.
        <br />
        스트라바 연동을 해제 시에는 스트라바와 연동된 개인정보들은 삭제되며 별도로 계정 완전 삭제를
        원하시는 경우 support@strank.io 으로 삭제요청을 하시기 바랍니다.
        <br />
        스트라바의 개인정보보호정책을 참고하여 주시기 바랍니다. https://www.strava.com/legal/privacy
        <br />
        <br />
        4. 개인정보의 보유기간 및 폐기
        <br />
        스트랭크 서비스를 제공받는 동안 서비스 제공을 위해 이용자의 개인정보는 스트랭크에서 보유하게
        됩니다. 단, 부정활동 및 비정상적인 서비스 이용자에 대한 이용기록은 수사협조와
        서비스품질관리를 위해 통신비밀보호법에 따라 1년간 보존됩니다.
      </TermsSection>

      <TermsSection title="개인정보관리책임자">
        - 이름 : 이상현
        <br />- e-Mail : support@strank.io
        <br />
        <br />
        서비스를 이용하시며 발생하는 모든 개인정보보호 관련 민원을 개인정보관리책임자 혹은 담당
        부서로 신고하실 수 있습니다.
        <br />
        - 기타 개인정보침해에 대한 신고나 상담이 필요하신 경우에는 아래 기관에 문의하시기 바랍니다.
        <br />
        <br />
        1. 개인분쟁조정위원회 <br />
        (www.1336.or.kr/1336)
        <br />
        2. 정보보호마크인증위원회 <br />
        (www.eprivacy.or.kr/02-580-0533~4)
        <br />
        3. 대검찰청 인터넷범죄수사센터 <br />
        (http://icic.sppo.go.kr/02-3480-3600)
        <br />
        4. 경찰청 사이버테러대응센터 <br />
        (www.ctrc.go.kr/02-392-0330)
      </TermsSection>
    </div>
  )
}

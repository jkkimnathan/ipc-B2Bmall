import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  CheckCircle,
  Wallet,
  ShieldCheck,
  Star,
  Phone,
  Wrench,
  Monitor,
  Code,
} from 'lucide-react'
import ScrollReveal from '@/components/landing/ScrollReveal'

export const metadata: Metadata = {
  title: 'iPC — 비즈니스를 위한 PC, 인텍앤컴퍼니',
  description: '성능, 안정성, 관리 효율까지. 기업이 필요로 하는 모든 것을 하나의 PC에 담았습니다.',
  robots: { index: true, follow: true },
}

function StarIcons() {
  return (
    <div className="flex gap-0.5 mb-5">
      {[...Array(5)].map((_, i) => (
        <Star key={i} className="size-[15px] fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="bg-white text-[#1d1d1f] antialiased overflow-x-hidden" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <ScrollReveal />

      {/* NAV */}
      <nav className="nav-blur fixed top-0 left-0 right-0 z-40 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <a href="#">
            <Image src="/landing/ipc-logo.png" alt="iPC" width={80} height={20} className="h-5 w-auto" />
          </a>
          <div className="hidden md:flex items-center gap-8 text-[13px] text-[#86868b] font-medium">
            <a href="#lineup" className="hover:text-[#1d1d1f] transition-colors duration-300">제품</a>
            <a href="#why" className="hover:text-[#1d1d1f] transition-colors duration-300">도입 효과</a>
            <a href="#stories" className="hover:text-[#1d1d1f] transition-colors duration-300">도입 사례</a>
            <a href="#process" className="hover:text-[#1d1d1f] transition-colors duration-300">도입 프로세스</a>
            <Link
              href="/dealer/login"
              className="bg-[#0071e3] text-white text-[13px] font-medium px-4 py-1.5 rounded-full hover:bg-[#0077ed] transition-colors"
            >
              B2B Mall
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-dvh flex flex-col items-center justify-center text-center pt-12 pb-8 px-6">
        <div className="reveal">
          <Image src="/landing/ipc-logo.png" alt="iPC" width={160} height={80} className="h-14 md:h-20 w-auto mx-auto mb-8" />
        </div>
        <h1 className="reveal reveal-d1 font-bold text-[#1d1d1f] mb-6" style={{ fontSize: 'clamp(2.75rem, 6vw, 5rem)', lineHeight: 1.08, letterSpacing: '-0.025em' }}>
          비즈니스의 기준을<br />다시 만들다.
        </h1>
        <p className="reveal reveal-d2 text-lg md:text-xl text-[#86868b] leading-relaxed max-w-[42ch] mx-auto mb-10">
          성능, 안정성, 관리 효율까지.<br className="hidden md:block" />
          기업이 필요로 하는 모든 것을 하나의 PC에 담았습니다.
        </p>
        <div className="reveal reveal-d3 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/dealer/login"
            className="bg-[#0071e3] text-white font-medium px-8 py-3.5 rounded-full text-base hover:bg-[#0077ed] active:scale-[0.98] transition-all"
          >
            맞춤 견적 받기
          </Link>
          <a href="#lineup" className="inline-flex items-center gap-1 text-[#0071e3] font-medium text-base group">
            제품 살펴보기
            <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-[3px]" />
          </a>
        </div>
      </section>

      {/* PRODUCT LINEUP */}
      <section id="lineup" className="py-24 md:py-32 lg:py-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 reveal">
            <p className="text-[#0071e3] font-semibold text-sm mb-3">제품 라인업</p>
            <h2 className="font-bold text-[#1d1d1f] mb-5" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 1.12 }}>
              당신의 업무에 맞는<br />정확한 PC.
            </h2>
            <p className="text-[#86868b] text-lg max-w-[48ch] mx-auto leading-relaxed">
              Business, Pro, Master — 세 가지 라인업으로 불필요한 사양 낭비 없이 정확한 성능을 제공합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* iPC Business — Featured */}
            <div className="apple-card bg-[#f5f5f7] reveal md:col-span-2">
              <div className="grid md:grid-cols-2 items-center">
                <div className="p-10 md:p-14">
                  <div className="inline-block bg-[#0071e3]/10 text-[#0071e3] text-xs font-semibold px-3 py-1 rounded-full mb-6">
                    가장 많이 선택하는 모델
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">iPC Business</h3>
                  <p className="text-[#86868b] leading-relaxed mb-8">
                    문서 작업, 화상회의, ERP 등 일상 업무에 최적화된 구성으로, 소음과 전력 소모를 최소화했습니다. 가장 합리적인 가격으로 시작하세요.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['INTEL 정품 CPU', 'Global No.1 ASUS MB', '공식 정품 Software', '저소음 저전력 설계'].map((t) => (
                      <span key={t} className="bg-white rounded-full px-4 py-1.5 text-xs text-[#1d1d1f] font-medium shadow-sm">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center p-8">
                  <Image src="/landing/business_01.png" alt="iPC Business" width={600} height={400} className="rounded-2xl w-full object-cover" />
                </div>
              </div>
            </div>

            {/* iPC Pro */}
            <div className="apple-card bg-[#f5f5f7] reveal md:col-span-2">
              <div className="grid md:grid-cols-2 items-center">
                <div className="p-10 md:p-14">
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">iPC Pro</h3>
                  <p className="text-[#86868b] leading-relaxed mb-8">
                    Adobe, CAD, 3D 모델링, 웹/앱 개발 등의 작업을 한계 없이 처리합니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['INTEL i5 이상', '최고 성능과 안정성', 'NVIDIA GPU 탑재', 'AhnLab 보안솔루션', 'Microsoft Windows Pro', 'SMART CAD, EZPDF'].map((t) => (
                      <span key={t} className="bg-white rounded-full px-4 py-1.5 text-xs text-[#1d1d1f] font-medium shadow-sm">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center p-8">
                  <Image src="/landing/pro_01.png" alt="iPC Pro" width={600} height={400} className="rounded-2xl w-full object-cover" />
                </div>
              </div>
            </div>

            {/* iPC Master */}
            <div className="apple-card bg-[#f5f5f7] reveal md:col-span-2">
              <div className="grid md:grid-cols-2 items-center">
                <div className="p-10 md:p-14">
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">iPC Master</h3>
                  <p className="text-[#86868b] leading-relaxed mb-8">
                    AI 딥러닝과 복잡한 3D 시뮬레이션, 이제 기다림 없이 완료하십시오.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['INTEL 최고성능 CPU', 'RTX 50 Series GPU', '연구 / 제작부터 분석까지'].map((t) => (
                      <span key={t} className="bg-white rounded-full px-4 py-1.5 text-xs text-[#1d1d1f] font-medium shadow-sm">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center p-8">
                  <Image src="/landing/master_01.png" alt="iPC Master" width={600} height={400} className="rounded-2xl w-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY iPC */}
      <section id="why" className="bg-[#f5f5f7] py-24 md:py-32 lg:py-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-20 reveal">
            <p className="text-[#0071e3] font-semibold text-sm mb-3">도입 효과</p>
            <h2 className="font-bold text-[#1d1d1f]" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 1.12 }}>
              왜 iPC인가.
            </h2>
          </div>

          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center mb-28 md:mb-36">
            <div className="reveal">
              <Image
                src="/landing/cost-saving.jpg"
                alt="총소유비용 절감"
                width={680}
                height={480}
                className="rounded-3xl w-full h-auto object-cover shadow-lg"
              />
            </div>
            <div className="reveal reveal-d1">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Wallet className="size-[26px] text-[#0071e3]" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 leading-snug">
                총 소유비용 절감
              </h3>
              <p className="text-lg text-[#1d1d1f] font-medium mb-4">
                개별 구매 대비 압도적인 패키지 혜택
              </p>
              <p className="text-[#86868b] text-[17px] leading-relaxed mb-8">
                정품으로 구성 된 PC와 Software를 솔루션으로 구성하시고, 총소유비용을 낮추세요.
              </p>
              <div className="space-y-4">
                {['공식 수입 정품 부품 사용', '규정에 따른 공식 A/S 지원', '최대 45% 비용 절감'].map((t) => (
                  <div key={t} className="flex items-start gap-4">
                    <CheckCircle className="size-5 text-[#0071e3] mt-0.5 shrink-0" />
                    <span className="text-[15px]">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="reveal order-2 lg:order-1">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-6">
                <ShieldCheck className="size-[26px] text-emerald-500" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 leading-snug">
                라이선스 자산 관리 및 보안
              </h3>
              <p className="text-lg text-[#1d1d1f] font-medium mb-4">
                기업용 정품 소프트웨어 통합 관리로 컴플라이언스 리스크 제로
              </p>
              <p className="text-[#86868b] text-[17px] leading-relaxed">
                AhnLab, Microsoft의 기업용 보안 프로세스를 구축하세요.
              </p>
            </div>
            <div className="reveal reveal-d1 order-1 lg:order-2">
              <Image
                src="/landing/official-auth.jpg"
                alt="라이선스 관리 및 보안"
                width={680}
                height={480}
                className="rounded-3xl w-full h-auto object-cover shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="stories" className="py-24 md:py-32 lg:py-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 reveal">
            <p className="text-[#0071e3] font-semibold text-sm mb-3">도입 사례</p>
            <h2 className="font-bold text-[#1d1d1f]" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 1.12 }}>
              기업들이 전하는 이야기.
            </h2>
          </div>

          {/* Logo Cloud */}
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 mb-20 reveal">
            {['숭실대학교', '로떼 i-cafe', 'SBS컴퓨터아카데미', '좋은책신사고', '해솔데이타', '유앤아이소프트'].map((n) => (
              <span key={n} className="text-[#c4c4c4] text-xl font-bold tracking-tight">{n}</span>
            ))}
          </div>

          {/* Testimonial Cards */}
          <div className="grid md:grid-cols-3 gap-5">
            <div className="apple-card bg-white shadow-sm p-8 flex flex-col justify-between reveal">
              <div>
                <StarIcons />
                <p className="text-[15px] text-[#1d1d1f] leading-relaxed mb-8">
                  &ldquo;학과별로 사양이 제각각인 PC를 운영하다 보니 통합 관리와 장애 대응에 큰 부담이 있었습니다.
                  iPC로 표준화한 후 강의실 PC 다운타임이 절반 이하로 줄었고, 정품 라이선스 통합 관리까지 한번에 해결됐습니다.
                  학생들 실습 환경이 안정되니 강의 만족도까지 올라갔습니다.&rdquo;
                </p>
              </div>
              <div className="pt-6 border-t border-black/5">
                <div className="text-sm font-semibold">숭실대학교</div>
              </div>
            </div>

            <div className="apple-card bg-white shadow-sm p-8 flex flex-col justify-between reveal reveal-d1">
              <div>
                <StarIcons />
                <p className="text-[15px] text-[#1d1d1f] leading-relaxed mb-6">
                  &ldquo;24시간 풀가동되는 매장에서 가장 중요한 건 안정성입니다. iPC 도입 후 PC 장애로 인한 매출 손실이 거의 사라졌습니다.&rdquo;
                </p>
              </div>
              <div className="pt-6 border-t border-black/5">
                <div className="text-sm font-semibold">로떼 i-cafe</div>
              </div>
            </div>

            <div className="apple-card bg-white shadow-sm p-8 flex flex-col justify-between reveal reveal-d2">
              <div>
                <StarIcons />
                <p className="text-[15px] text-[#1d1d1f] leading-relaxed mb-6">
                  &ldquo;수강생이 매주 바뀌는 강의실 환경에서도 성능 편차 없이 일정하게 유지됩니다. Adobe와 개발 도구 동시 실행도 쾌적합니다.&rdquo;
                </p>
              </div>
              <div className="pt-6 border-t border-black/5">
                <div className="text-sm font-semibold">SBS컴퓨터아카데미</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="bg-[#f5f5f7] py-24 md:py-32 lg:py-40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16 reveal">
            <p className="text-[#0071e3] font-semibold text-sm mb-3">도입 프로세스</p>
            <h2 className="font-bold text-[#1d1d1f]" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 1.12 }}>
              도입까지, 네 단계.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 reveal">
            {[
              { n: '1', title: '요구사항 분석', desc: '업무 환경, 소프트웨어, 예산을 파악해 최적의 구성을 제안합니다.' },
              { n: '2', title: '맞춤 견적', desc: '수량, 사양, 납품 일정을 반영한 상세 견적을 제공합니다.' },
              { n: '3', title: '세팅 및 납품', desc: '프리도스부터 Software 설치까지, 요청하시는 세팅으로 납품합니다.' },
              { n: '4', title: '운영 지원', desc: '전담 매니저와 공식 A/S 센터가 사후지원을 보증합니다.' },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <span className="text-[#0071e3] font-bold text-xl">{step.n}</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-[#86868b] text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 lg:py-40">
        <div className="max-w-xl mx-auto px-6 text-center">
          <div className="reveal">
            <h2 className="font-bold text-[#1d1d1f] mb-5" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)', lineHeight: 1.12 }}>
              지금 상담받으세요.
            </h2>
            <p className="text-[#86868b] text-lg leading-relaxed mb-10">
              iPC B2B Mall에서 라인업을 확인하고<br className="hidden md:block" />
              맞춤 견적을 직접 요청하세요.
            </p>
            <Link
              href="/dealer/login"
              className="inline-flex items-center justify-center bg-[#0071e3] text-white font-semibold px-10 py-4 rounded-full text-lg hover:bg-[#0077ed] active:scale-[0.98] transition-all"
            >
              iPC B2B Mall 바로가기
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 border-t border-black/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-14">
            <div className="md:col-span-2">
              <Image src="/landing/ipc-logo.png" alt="iPC" width={80} height={24} className="h-6 w-auto mb-4" />
              <p className="text-[#86868b] text-sm leading-relaxed max-w-[38ch]">
                기업 업무 환경에 최적화된 비즈니스 PC를 설계하고 공급합니다.
                안정적인 성능과 체계적인 사후 관리로 IT 인프라의 파트너가 되겠습니다.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">제품</h4>
              <ul className="space-y-2.5 text-sm text-[#86868b]">
                <li><a href="#lineup" className="hover:text-[#1d1d1f] transition-colors duration-300">iPC Business</a></li>
                <li><a href="#lineup" className="hover:text-[#1d1d1f] transition-colors duration-300">iPC Pro</a></li>
                <li><a href="#lineup" className="hover:text-[#1d1d1f] transition-colors duration-300">iPC Master</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">고객 지원</h4>
              <ul className="space-y-2.5 text-sm text-[#86868b]">
                <li className="flex items-center gap-2"><Phone className="size-[15px]" />1800-7631</li>
                <li className="flex items-center gap-2"><Wrench className="size-[15px]" />A/S : 1544-6549</li>
                <li className="flex items-center gap-2"><Monitor className="size-[15px]" />iPC : 02-2129-7935</li>
                <li className="flex items-center gap-2"><Code className="size-[15px]" />Software : 02-2129-7931</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

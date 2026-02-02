<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'

const route = useRoute()
const router = useRouter()

const id = route.params.id

// --- 상태 관리 ---
const company = ref(null)         // 기업 상세 데이터
const isLoading = ref(true)       // 로딩 상태 (테스트용)
const isError = ref(false)

// --- 차트 및 필터 상태 ---
const performanceChartRef = ref(null)
const deepAnalysisChartRef = ref(null)
let perfChartInst = null
let deepChartInst = null

const selectedPerfMetric = ref('매출액')
const selectedDeepCategory = ref('growth')
const selectedDeepMetric = ref('')
const selectedPeerId = ref(null)
const selectedValuationScenario = ref('standard')

const API_BASE_URL = 'http://localhost:8080/api'

const dummyData = {
  1: {
    id: 1,
    name: '카카오페이',
    code: '377300',
    industry: '핀테크',
    marketType: 'KOSPI',
    products: '간편결제, 송금, 금융중개',
    expectedPrice: '24,000 ~ 28,000원',
    finalPrice: '26,000원',
    totalShares: '130,000,000주',
    publicShares: '17,000,000주',
    generalShares: '4,250,000주',
    underwriter: '삼성증권, 대신증권',

    schedule: [
      { step: '예비심사청구', date: '2025. 11. 10.', status: 'done' },
      { step: '심사승인', date: '2026. 01. 12.', status: 'done' },
      { step: '신고서제출', date: '2026. 01. 13.', status: 'active' },
      { step: '수요예측', date: '2026. 02. 04. ~ 02. 10.', status: 'future' },
      { step: '청약신청', date: '2026. 02. 20. ~ 02. 23.', status: 'future' },
      { step: '배정공고', date: '2026. 02. 25.', status: 'future' },
      { step: '납입', date: '2026. 02. 25.', status: 'future' },
      { step: '환불', date: '2026. 02. 25.', status: 'future' },
      { step: '상장', date: '미정', status: 'future' },
    ],

    financials: {
      quarters: ['24.2Q', '24.3Q', '24.4Q', '25.1Q', '25.2Q', '25.3Q'],
      revenue: [1100, 1150, 1200, 1350, 1420, 1580],
      opProfit: [40, 45, 50, 80, 120, 150],
      netIncome: [20, 25, 30, 60, 90, 110]
    },
    peers: [
      {
        id: 101,
        name: "네이버페이",
        marketCap: "28조 5,000억",  // 시가총액 (체급)
        per: "25.4배",              // PER (기본)
        pbr: "1.8배"                // PBR (자산가치)
      },
      {
        id: 102,
        name: "토스",
        marketCap: "9조 1,000억",
        per: "10배",                 // 적자인 경우
        pbr: "3.2배"
      },
      {
        id: 103,
        name: "뱅크샐러드",
        marketCap: "4,500억",
        per: "18.2배",
        pbr: "2.5배"
      }
    ],
    deepMetrics: {
      growth: {
        label: '성장성',
        items: [
          { key: 'revGrowth', name: '매출액증가율', unit: '%' },
          { key: 'niGrowth', name: '순이익증가율', unit: '%' },
          { key: 'assetGrowth', name: '총자산증가율', unit: '%' }
        ],
        data: {
          revGrowth: { target: [10, 12, 15, 18, 22, 25], avg: [9, 9, 10, 10, 11, 12], peers: { 101: [10, 11, 12, 14, 15, 16], 102: [25, 28, 30, 35, 40, 42], 103: [4, 5, 5, 6, 5, 4] } },
          niGrowth: { target: [0, 2, 5, 10, 15, 20], avg: [7, 8, 8, 8, 9, 9], peers: { 101: [9, 9, 10, 11, 12, 12], 102: [-15, -12, -10, -5, 0, 5], 103: [1, 2, 2, 3, 2, 1] } },
          assetGrowth: { target: [6, 7, 8, 9, 10, 12], avg: [5, 5, 5, 5, 5, 5], peers: { 101: [6, 6, 7, 7, 8, 8], 102: [22, 21, 20, 18, 15, 12], 103: [3, 3, 3, 3, 3, 3] } }
        }
      },
      profit: {
        label: '수익성',
        items: [
          { key: 'gpm', name: '매출총이익률', unit: '%' },
          { key: 'opm', name: '영업이익률', unit: '%' },
          { key: 'roe', name: 'ROE', unit: '%' }
        ],
        data: {
          gpm: { target: [38, 39, 40, 42, 45, 46], avg: [34, 34, 35, 35, 35, 35], peers: { 101: [37, 37, 38, 39, 40, 40], 102: [15, 18, 20, 25, 30, 35], 103: [30, 30, 30, 30, 30, 30] } },
          opm: { target: [8, 9, 10, 12, 15, 18], avg: [7, 7, 8, 8, 8, 8], peers: { 101: [14, 14, 15, 15, 16, 16], 102: [-8, -6, -5, -2, 1, 3], 103: [5, 5, 5, 5, 4, 4] } },
          roe: { target: [3, 4, 5, 7, 9, 12], avg: [5, 5, 6, 6, 6, 6], peers: { 101: [9, 9, 10, 10, 11, 11], 102: [-20, -18, -15, -10, -5, 0], 103: [3, 3, 3, 3, 3, 3] } }
        }
      },
      stability: {
        label: '안정성',
        items: [
          { key: 'debtRatio', name: '부채비율', unit: '%' },
          { key: 'intCov', name: '이자보상배율', unit: '배' },
          { key: 'capRatio', name: '자기자본비율', unit: '%' }
        ],
        data: {
          debtRatio: { target: [130, 125, 120, 115, 110, 105], avg: [100, 100, 100, 100, 100, 100], peers: { 101: [95, 92, 90, 85, 80, 80], 102: [220, 210, 200, 180, 160, 150], 103: [50, 50, 50, 50, 50, 50] } },
          intCov: { target: [2, 2.5, 3, 4, 5, 6], avg: [5, 5, 5, 5, 5, 5], peers: { 101: [7, 7, 8, 8, 9, 9], 102: [0.2, 0.4, 0.5, 0.8, 1.0, 1.2], 103: [10, 10, 10, 10, 10, 10] } },
          capRatio: { target: [35, 38, 40, 42, 45, 48], avg: [50, 50, 50, 50, 50, 50], peers: { 101: [58, 59, 60, 60, 60, 60], 102: [15, 18, 20, 25, 30, 35], 103: [70, 70, 70, 70, 70, 70] } }
        }
      }
    },
    valuation: {
      conservative: {
        label: '보수적 시나리오',
        modelName: '벤저민 그레이엄 모델',
        price: '75,000원',
        gap: '+25%',
        desc: '미래 성장을 배제하고, 현재 확정된 실적과 자산 가치를 기준으로 계산합니다.',
        formula: '√(22.5 × 5,000 × 50,000) = 75,000원',
        items: [
          { name: '적정 PER×PBR (상수)', value: '22.5' },
          { name: '최근 EPS', value: '5,000 원' },
          { name: '최근 BPS', value: '50,000 원' }
        ]
      },
      standard: {
        label: '시장표준 시나리오',
        modelName: "아스워스 다모다란의 '상대가치 평가'",
        price: '20,000원',
        gap: '+33%',
        desc: '유사 기업들의 평균 PER 20.0배를 적용한 가장 합리적인 목표가입니다.',
        formula: '(1,000억 × 20.0) / 5,000만 = 20,000원',
        items: [
          { name: '평균 유사 기업 PER', value: '20.0배' },
          { name: '예상 당기순이익', value: '1,000억 원' },
          { name: '발행 주식 총수', value: '5,000만 주' }
        ]
      },
      aggressive: {
        label: '공격적 시나리오',
        modelName: '피터 린치의 PEG 모델',
        price: '90,000원',
        gap: '+50%',
        desc: '이익의 성장 속도에 프리미엄을 부여하여 최대 상승 잠재력을 산출합니다.',
        formula: '(30.0 × 1.0) × 3,000 = 90,000원',
        items: [
          { name: '연평균 성장률(G)', value: '30.0%' },
          { name: 'PEG 적용값', value: '1.0' },
          { name: '최근 EPS', value: '3,000 원' }
        ]
      }
    },
    riskReport: {
      grade: "CAUTION", // 'SAFE' | 'CAUTION' | 'DANGER' (등급)
      score: 65, // 위험도 점수 (0~100, 높을수록 안전)
      aiSummary: [
        "최근 3년간 영업이익률이 감소 추세에 있어 수익성 개선 모니터링이 필요합니다.",
        "원자재 가격 상승에 따른 마진율 저하가 우려되는 구간입니다.",
        "다만, 부채비율은 업계 평균 이하로 재무적 안정성은 유지하고 있습니다."
      ],
      factors: [ // 기존 상세 리스크 항목
        { title: "유통물량 주의", desc: "상장 직후 오버행 이슈 발생 가능성", severity: "high" },
        { title: "원자재 가격 변동", desc: "국제 유가 상승에 따른 원가 부담 증가", severity: "medium" }
      ]
    }
  }
}

// =========================================================
// 👇 1. 📡 [실제 백엔드 연동] (나중에 주석 풀고 사용하세요)
// =========================================================
/*
const fetchCompanyDetail = async (corpId) => {
  try {
    isLoading.value = true
    isError.value = false

    // GET /api/corporation/{id}
    const response = await axios.get(`${API_BASE_URL}/corporation/${corpId}`)
    company.value = response.data

    // 초기값 설정
    if (company.value?.deepMetrics?.growth?.items?.length > 0) {
      selectedDeepMetric.value = company.value.deepMetrics.growth.items[0].key
    }
    if (company.value?.peers?.length > 0) {
      selectedPeerId.value = company.value.peers[0].id
    }

    // 차트 그리기
    await nextTick()
    renderPerfChart()
    renderDeepChart()

  } catch (error) {
    console.error('API 호출 실패:', error)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}
*/

// 📡 [수정] 백엔드 대신 더미 데이터를 불러오는 함수
const fetchCompanyDetail = (corpId) => {
  // 실제 API 호출하는 척 (로딩 스피너 확인용 0.5초 딜레이)
  isLoading.value = true

  setTimeout(() => {
    // 1. 더미 데이터에서 id로 찾기 (없으면 1번 데이터 사용)
    const data = dummyData[corpId] || dummyData[1]
    company.value = data

    // 2. 데이터 로드 후 초기값 설정
    if (company.value?.deepMetrics?.growth?.items?.length > 0) {
      selectedDeepMetric.value = company.value.deepMetrics.growth.items[0].key
    }
    if (company.value?.peers?.length > 0) {
      selectedPeerId.value = company.value.peers[0].id
    }

    // 3. 차트 그리기
    isLoading.value = false
    nextTick(() => {
      renderPerfChart()
      renderDeepChart()
    })
  }, 500) // 0.5초 뒤 실행
}

// --- 차트 렌더링 함수 ---
const formatNum = (n) => n ? n.toLocaleString() : '-'

const renderPerfChart = () => {
  if (!performanceChartRef.value || !company.value) return
  if (perfChartInst) perfChartInst.dispose()

  perfChartInst = echarts.init(performanceChartRef.value)
  const metricKey = selectedPerfMetric.value === '매출액' ? 'revenue'
      : selectedPerfMetric.value === '영업이익' ? 'opProfit' : 'netIncome'

  const data = company.value.financials[metricKey]
  const color = '#3182F6'

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#F2F4F6',
      borderWidth: 1,
      textStyle: {color: '#333D4B', fontSize: 12},
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px;'
    },
    grid: {top: '15%', left: '0%', right: '0%', bottom: '5%', containLabel: true},
    xAxis: {
      type: 'category', data: company.value.financials.quarters,
      axisLine: {show: false}, axisTick: {show: false},
      axisLabel: {color: '#8B95A1', fontSize: 11, margin: 12}
    },
    yAxis: {
      type: 'value',
      splitLine: {lineStyle: {type: 'dashed', color: '#E5E8EB', width: 0.8}},
      axisLabel: {show: false}
    },
    series: [{
      name: selectedPerfMetric.value,
      type: 'bar',
      data: data,
      barWidth: 20,
      itemStyle: {color: color, borderRadius: [6, 6, 6, 6]},
      label: {
        show: true, position: 'top', formatter: (p) => formatNum(p.value),
        fontSize: 11, fontWeight: 600, color: '#4E5968'
      }
    }]
  }
  perfChartInst.setOption(option)
}

const renderDeepChart = () => {
  if (!deepAnalysisChartRef.value || !company.value) return
  if (deepChartInst) deepChartInst.dispose()
  deepChartInst = echarts.init(deepAnalysisChartRef.value)

  const categoryData = company.value.deepMetrics[selectedDeepCategory.value].data
  const metricData = categoryData[selectedDeepMetric.value]
  if (!metricData) return

  const peerId = selectedPeerId.value || company.value.peers[0].id
  const peerName = company.value.peers.find(p => p.id === peerId)?.name || '경쟁사'

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#F2F4F6',
      textStyle: {color: '#333D4B'},
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-radius: 12px;'
    },
    legend: {bottom: 0, icon: 'circle', itemGap: 20, textStyle: {color: '#8B95A1', fontSize: 12}},
    grid: {top: '10%', left: '2%', right: '4%', bottom: '15%', containLabel: true},
    xAxis: {
      type: 'category',
      data: ['24.2Q', '24.3Q', '24.4Q', '25.1Q', '25.2Q', '25.3Q'],
      axisLine: {show: false},
      axisTick: {show: false},
      axisLabel: {color: '#8B95A1', fontSize: 11}
    },
    yAxis: {type: 'value', splitLine: {lineStyle: {color: '#F2F4F6'}}},
    series: [
      {
        name: company.value.name, type: 'line', data: metricData.target,
        symbol: 'circle', symbolSize: 8,
        itemStyle: {color: '#3182F6', borderColor: '#fff', borderWidth: 2},
        lineStyle: {width: 3}
      },
      {
        name: peerName, type: 'line', data: metricData.peers[peerId],
        symbol: 'circle', symbolSize: 8,
        itemStyle: {color: '#EF4444', borderColor: '#fff', borderWidth: 2},
        lineStyle: {width: 3}
      },
      {
        name: '업계평균', type: 'line', data: metricData.avg,
        symbol: 'none', itemStyle: {color: '#B0B8C1'},
        lineStyle: {width: 2, type: 'dashed'}
      }
    ]
  }
  deepChartInst.setOption(option)
}

// --- 생명주기 ---
onMounted(() => {
  fetchCompanyDetail(id)

  window.addEventListener('resize', () => {
    perfChartInst?.resize();
    deepChartInst?.resize()
  })
})

// 리스크 등급에 따른 스타일 및 텍스트 반환
const getRiskLevelInfo = (grade) => {
  if (grade === 'SAFE') {
    return {
      label: '안전',
      desc: '통상적인 사업 위험 수준입니다.',
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: '🟢'
    }
  } else if (grade === 'CAUTION') {
    return {
      label: '주의',
      desc: '모니터링이 필요한 대외 변수가 존재합니다.',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: '🟡'
    }
  } else {
    return {
      label: '위험',
      desc: '투자 원금 손실 가능성이 있는 중대 리스크가 있습니다.',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: '🔴'
    }
  }
}

// --- Watcher ---
watch(selectedPerfMetric, renderPerfChart)
watch(selectedDeepCategory, (newVal) => {
  if (company.value) {
    selectedDeepMetric.value = company.value.deepMetrics[newVal].items[0].key
  }
})
watch([selectedDeepCategory, selectedDeepMetric, selectedPeerId], renderDeepChart)
</script>

<template>
  <div class="min-h-screen bg-[#F2F4F6] pb-24 font-sans text-[#333D4B]">

    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-screen">
      <svg class="animate-spin h-8 w-8 text-[#3182F6] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none"
           viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-[#8B95A1] font-medium">데이터를 분석하고 있어요...</p>
    </div>

    <div v-else-if="isError" class="flex flex-col items-center justify-center min-h-screen">
      <p class="text-[#EF4444] font-bold mb-2">데이터를 불러오지 못했습니다.</p>
      <button @click="fetchCompanyDetail(id)" class="px-4 py-2 bg-white border rounded-lg text-sm text-[#4E5968]">다시
        시도
      </button>
    </div>

    <div v-else-if="company">
      <header class="bg-white sticky top-0 z-20 border-b border-[#F2F4F6]/50 backdrop-blur-md bg-white/90">
        <div class="max-w-2xl mx-auto px-5 py-3 flex items-center gap-2">
          <button @click="router.back()"
                  class="p-1 -ml-1 text-[#333D4B] hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor"
                 stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 class="text-lg font-bold flex items-center gap-2 text-[#191F28]">
              {{ company.name }}
              <span class="text-[11px] font-medium text-[#8B95A1] bg-[#F2F4F6] px-1.5 py-0.5 rounded-[6px]">{{
                  company.code
                }}</span>
            </h1>
          </div>
        </div>
      </header>

      <main class="max-w-2xl mx-auto px-5 py-6 space-y-5">

        <section class="bg-white rounded-[24px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <h2 class="text-[19px] font-bold text-[#191F28] mb-5">핵심 정보</h2>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-[#8B95A1] text-[15px]">주요제품</span>
              <span class="font-medium text-[#333D4B] text-[15px] text-right max-w-[60%]">{{ company.products }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[#8B95A1] text-[15px]">희망공모가</span>
              <span class="font-bold text-[#3182F6] text-[15px]">{{ company.expectedPrice }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[#8B95A1] text-[15px]">확정공모가</span>
              <span class="font-bold text-[18px] text-[#191F28]">{{ company.finalPrice }}</span>
            </div>

            <div class="h-[1px] bg-[#F2F4F6] my-2"></div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-[13px] text-[#8B95A1] mb-1">공모주식수</p>
                <p class="font-semibold text-[#333D4B]">{{ company.publicShares }}</p>
              </div>
              <div>
                <p class="text-[13px] text-[#8B95A1] mb-1">일반청약(25%)</p>
                <p class="font-semibold text-[#333D4B]">{{ company.generalShares }}</p>
              </div>
            </div>
            <div>
              <span class="text-[13px] text-[#8B95A1] block mb-2">청약 주관사</span>
              <div class="flex flex-wrap gap-2">
                <span v-for="uw in company.underwriter.split(', ')" :key="uw"
                      class="bg-[#F2F4F6] text-[#4E5968] px-3 py-1.5 rounded-[8px] text-[13px] font-bold">
                  {{ uw }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-[24px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <h2 class="text-[19px] font-bold text-[#191F28] mb-6">진행 일정</h2>
          <div class="relative pl-2">
            <div v-for="(item, idx) in company.schedule" :key="idx" class="relative pb-9 last:pb-0">
              <div v-if="idx < company.schedule.length - 1"
                   class="absolute left-[5px] top-5 bottom-0 w-[1px] bg-[#E5E8EB]"></div>

              <div class="flex items-start gap-4">
                <div class="relative z-10 h-5 flex items-center justify-center shrink-0">
                  <div
                      class="w-[11px] h-[11px] rounded-full flex items-center justify-center transition-all duration-300"
                      :class="{
                         'bg-[#B0B8C1]': item.status === 'done',
                         'bg-[#3182F6] ring-[3px] ring-blue-100 scale-110': item.status === 'active',
                         'bg-white border border-[#E5E8EB]': item.status === 'future'
                       }">
                    <svg v-if="item.status === 'done'" class="w-1.5 h-1.5 text-white" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" stroke-width="4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                </div>

                <div class="flex-1 flex justify-between items-center h-5">
                  <span class="text-[15px]"
                        :class="item.status === 'active' ? 'text-[#3182F6] font-bold' : item.status === 'future' ? 'text-[#B0B8C1]' : 'text-[#4E5968] font-medium'">
                    {{ item.step }}
                  </span>
                  <span class="text-[14px]"
                        :class="item.status === 'active' ? 'text-[#3182F6] font-bold' : item.status === 'future' ? 'text-[#B0B8C1]' : 'text-[#4E5968]'">
                    {{ item.date }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-[24px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <h2 class="text-[19px] font-bold text-[#191F28] mb-4">실적 추이</h2>
          <div class="flex bg-[#F2F4F6] p-1 rounded-[12px] mb-6">
            <button v-for="tab in ['매출액', '영업이익', '순이익']" :key="tab"
                    @click="selectedPerfMetric = tab"
                    class="flex-1 py-2 text-[13px] font-bold rounded-[10px] transition-all duration-200"
                    :class="selectedPerfMetric === tab ? 'bg-white text-[#333D4B] shadow-sm' : 'text-[#8B95A1] hover:text-[#4E5968]'">
              {{ tab }}
            </button>
          </div>
          <div ref="performanceChartRef" class="w-full h-52"></div>
        </section>

        <section class="bg-white rounded-[24px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-[19px] font-bold text-[#191F28] flex items-center gap-1">
              <span class="text-[#3182F6]">AI</span> 추천 유사 기업
            </h2>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div v-for="(peer, idx) in company.peers" :key="peer.id"
                 class="bg-[#F9FAFB] rounded-[16px] p-4 flex flex-col items-center text-center border border-transparent hover:border-blue-100 transition-colors cursor-pointer">

      <span class="w-6 h-6 rounded-full bg-white text-[12px] font-bold flex items-center justify-center text-[#3182F6] shadow-sm mb-2 border border-gray-50">
        {{ String.fromCharCode(65 + idx) }}
      </span>

              <p class="text-[14px] font-bold text-[#333D4B] mb-1.5 truncate w-full">{{ peer.name }}</p>

              <div class="bg-white px-2 py-1 rounded-[6px] border border-gray-100 mb-2 w-full">
                <p class="text-[10px] text-[#8B95A1] mb-0.5">시가총액</p>
                <p class="text-[12px] font-bold text-[#333D4B]">{{ peer.marketCap }}</p>
              </div>

              <div class="flex justify-center gap-2 w-full">
                <div class="text-center">
                  <span class="text-[9px] text-[#8B95A1] block">PER</span>
                  <span class="text-[11px] font-medium text-[#4E5968]">{{ peer.per }}</span>
                </div>
                <div class="w-[1px] bg-gray-200 h-6"></div> <div class="text-center">
                <span class="text-[9px] text-[#8B95A1] block">PBR</span>
                <span class="text-[11px] font-medium text-[#4E5968]">{{ peer.pbr }}</span>
              </div>
              </div>

            </div>
          </div>
        </section>

        <section class="bg-white rounded-[24px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <h2 class="text-[19px] font-bold text-[#191F28] mb-5">유사 기업 비교</h2>

          <div class="flex border-b border-[#F2F4F6] mb-5">
            <button v-for="(cat, key) in company.deepMetrics" :key="key"
                    @click="selectedDeepCategory = key"
                    class="flex-1 pb-3 text-[15px] font-bold border-b-[2px] transition-colors"
                    :class="selectedDeepCategory === key ? 'border-[#333D4B] text-[#333D4B]' : 'border-transparent text-[#B0B8C1]'">
              {{ cat.label }}
            </button>
          </div>

          <div class="flex gap-2 mb-5 overflow-x-auto scrollbar-hide py-1">
            <button v-for="item in company.deepMetrics[selectedDeepCategory].items" :key="item.key"
                    @click="selectedDeepMetric = item.key"
                    class="px-3.5 py-2 rounded-[20px] text-[13px] font-bold whitespace-nowrap transition-all"
                    :class="selectedDeepMetric === item.key
                            ? 'bg-[#3182F6] text-white shadow-md shadow-blue-200'
                            : 'bg-[#F2F4F6] text-[#6B7684]'">
              {{ item.name }}
            </button>
          </div>

          <div class="flex justify-end mb-2">
            <div class="bg-[#F2F4F6] rounded-[8px] px-2 py-1 flex items-center gap-2">
              <span class="text-[11px] text-[#8B95A1] font-medium">VS</span>
              <select v-model="selectedPeerId"
                      class="text-[12px] bg-transparent border-none font-bold text-[#333D4B] focus:ring-0 py-0 pl-0 pr-6 cursor-pointer">
                <option v-for="p in company.peers" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
          </div>

          <div ref="deepAnalysisChartRef" class="w-full h-64"></div>

          <div class="flex justify-center gap-4 mt-3">
            <div class="flex items-center gap-1.5 text-[11px] font-medium text-[#4E5968]">
              <span class="w-2.5 h-2.5 rounded-full bg-[#3182F6]"></span> {{ company.name }}
            </div>
            <div class="flex items-center gap-1.5 text-[11px] font-medium text-[#4E5968]">
              <span class="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> 선택 경쟁사
            </div>
          </div>
        </section>

        <section class="bg-white rounded-[24px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <h2 class="text-[19px] font-bold text-[#191F28] mb-5">적정 주가 시나리오</h2>

          <div class="flex bg-[#F2F4F6] p-1 rounded-[12px] mb-6">
            <button v-for="(scen, key) in company.valuation" :key="key"
                    @click="selectedValuationScenario = key"
                    class="flex-1 py-2 rounded-[10px] text-[13px] font-bold transition-all"
                    :class="selectedValuationScenario === key ? 'bg-white shadow-sm text-[#3182F6]' : 'text-[#8B95A1]'">
              {{ key === 'conservative' ? '보수적' : key === 'standard' ? '시장표준' : '공격적' }}
            </button>
          </div>

          <div>
            <h3 class="text-[15px] font-bold text-[#191F28] mb-1">
              {{ company.valuation[selectedValuationScenario].label }}: {{ company.valuation[selectedValuationScenario].modelName }}
            </h3>
            <p class="text-[13px] text-[#4E5968] mb-4 break-keep leading-relaxed">
              {{ company.valuation[selectedValuationScenario].desc }}
            </p>

            <div class="flex items-end gap-2 mb-6">
      <span class="text-[32px] font-bold text-[#191F28] leading-none tracking-tight">
        {{ company.valuation[selectedValuationScenario].price }}
      </span>
              <span class="text-[15px] font-bold mb-1"
                    :class="company.valuation[selectedValuationScenario].gap.includes('+') ? 'text-[#EF4444]' : 'text-[#3182F6]'">
        {{ company.valuation[selectedValuationScenario].gap }}
      </span>
            </div>

            <div class="bg-[#F9FAFB] rounded-[16px] p-5 border border-[#F2F4F6]">
              <div class="space-y-3">
                <div v-for="(item, idx) in company.valuation[selectedValuationScenario].items" :key="idx"
                     class="flex justify-between items-center text-[13px]">
                  <span class="text-[#8B95A1] font-medium">{{ item.name }}</span>
                  <span class="font-bold text-[#333D4B]">{{ item.value }}</span>
                </div>
              </div>

              <div class="mt-4 pt-4 border-t border-[#E5E8EB]">
                <p class="text-[11px] text-[#8B95A1] mb-2 font-medium">산출 공식</p>
                <div class="text-[13px] font-medium text-[#4E5968] bg-white px-3 py-2.5 rounded-[10px] border border-[#F2F4F6] w-full text-center">
                  {{ company.valuation[selectedValuationScenario].formula }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="bg-white rounded-[24px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)] overflow-hidden relative">
          <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          <h2 class="text-[19px] font-bold text-[#191F28] mb-6 flex items-center gap-2 relative z-10">
    <span class="bg-blue-100 p-1.5 rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#3182F6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </span>
            핵심 투자 위험 분석
          </h2>

          <div class="bg-gray-50 rounded-[20px] p-5 mb-5 border border-gray-100">
            <div class="flex justify-between items-start mb-4">
              <div>
                <p class="text-[13px] text-[#8B95A1] mb-1">AI 리스크 종합 진단</p>
                <div class="flex items-center gap-2">
                  <h3 class="text-[22px] font-bold" :class="getRiskLevelInfo(company.riskReport.grade).color">
                    {{ getRiskLevelInfo(company.riskReport.grade).label }} 단계
                  </h3>
                  <span class="text-[12px] px-2 py-1 rounded-full font-medium"
                        :class="[getRiskLevelInfo(company.riskReport.grade).bg, getRiskLevelInfo(company.riskReport.grade).color]">
            Score {{ company.riskReport.score }}
          </span>
                </div>
              </div>
              <div class="flex gap-1.5 bg-white p-1.5 rounded-full shadow-sm border border-gray-100">
                <div class="w-4 h-4 rounded-full transition-all duration-300"
                     :class="company.riskReport.grade === 'SAFE' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] scale-110' : 'bg-gray-200'"></div>
                <div class="w-4 h-4 rounded-full transition-all duration-300"
                     :class="company.riskReport.grade === 'CAUTION' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] scale-110' : 'bg-gray-200'"></div>
                <div class="w-4 h-4 rounded-full transition-all duration-300"
                     :class="company.riskReport.grade === 'DANGER' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] scale-110' : 'bg-gray-200'"></div>
              </div>
            </div>

            <p class="text-[13px] text-[#4E5968] leading-snug">
              {{ getRiskLevelInfo(company.riskReport.grade).desc }}
            </p>
          </div>

          <div class="mb-6">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-[12px] font-bold text-[#3182F6]">AI 요약</span>
              <div class="h-[1px] flex-1 bg-gray-100"></div>
            </div>
            <div class="space-y-2">
              <div v-for="(summary, idx) in company.riskReport.aiSummary" :key="idx"
                   class="flex gap-3 items-start group">
                <span class="text-[#3182F6] font-serif text-[16px] leading-none mt-0.5 opacity-50 group-hover:opacity-100 transition-opacity">"</span>
                <p class="text-[14px] text-[#333D4B] leading-relaxed font-medium">
                  {{ summary }}
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div v-for="(risk, idx) in company.riskReport.factors" :key="idx"
                 class="bg-white border border-[#E5E8EB] rounded-[16px] p-4 hover:border-blue-200 transition-colors cursor-pointer group">
              <div class="flex items-start gap-3">
                <div class="mt-0.5">
                  <svg v-if="risk.severity === 'high'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-[14px] font-bold text-[#191F28] mb-1 group-hover:text-[#3182F6] transition-colors">{{ risk.title }}</h3>
                  <p class="text-[13px] text-[#6B7684] leading-relaxed">{{ risk.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
<script setup>
import { ref, onMounted, watch, nextTick, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import axios from 'axios'
// API 경로 확인 필요
import { getUpcomingIpoRiskAnalysis } from '../api'

const route = useRoute()
const router = useRouter()
const id = route.params.id

// --- 상태 관리 ---
const company = ref(null)         // 기업 상세 데이터 (기본 정보, 재무 등)
const isLoading = ref(true)       // 로딩 상태
const isError = ref(false)

// --- 위험 분석 관련 상태 (별도 API) ---
const riskAnalysis = ref('')
const riskLoading = ref(false)
const riskError = ref('')

// AI 분석 텍스트 파싱 (Markdown -> 구조화된 데이터)
const analysisSections = computed(() => {
  const text = (riskAnalysis.value || '').trim()
  if (!text) {
    return { summaryItems: [], judgmentText: '' }
  }
  const summaryMatch = text.match(/[\[【]핵심 투자 리스크 요약[\]】]\s*([\s\S]*?)(?=\n\s*[\[【]종합 판단[\]】]|$)/)
  const judgmentMatch = text.match(/[\[【]종합 판단[\]】]\s*([\s\S]*)$/)

  const summaryText = summaryMatch ? summaryMatch[1].trim() : ''
  const judgmentText = judgmentMatch ? judgmentMatch[1].trim() : ''

  const summaryItems = summaryText
      .split(/\n\s*\d+\.\s*/)
      .map(s => s.trim())
      .filter(Boolean)

  return {
    summaryItems: summaryItems.map(item => {
      const cleaned = formatArrowBreaks(item)
      const parts = cleaned.split('\n')
      const title = parts.shift() || ''
      const body = parts.join('\n').trim()
      return { title, body }
    }),
    judgmentText: formatArrowBreaks(judgmentText),
  }
})

function formatArrowBreaks(text) {
  if (!text) return ''
  return text
      .replace(/^\s*\d+\.\s*/, '')
      .replace(/\s*->\s*/g, '\n→ ')
}

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

// --- 데이터 가져오기 ---
const fetchCompanyDetail = async (targetId) => {
  // 1. 기업 상세 정보 로드 (재무, 기본정보)
  try {
    isLoading.value = true
    isError.value = false

    const response = await axios.get(`${API_BASE_URL}/upcoming-ipo/${targetId}/financials`)
    company.value = response.data

    if (company.value) {
      if (company.value.deepMetrics?.[selectedDeepCategory.value]?.items?.length > 0) {
        selectedDeepMetric.value = company.value.deepMetrics[selectedDeepCategory.value].items[0].key
      }
      if (company.value.peers?.length > 0) {
        selectedPeerId.value = company.value.peers[0].id
      }
    }

    // DOM 생성 대기 후 차트 렌더링
    await nextTick()
    setTimeout(() => {
      if (company.value?.financials) renderPerfChart()
      if (company.value?.deepMetrics) renderDeepChart()
    }, 50)

  } catch (error) {
    console.error('데이터 로드 실패:', error)
    isError.value = true
  } finally {
    isLoading.value = false
  }

  // 2. 위험 분석 데이터 로드 (별도 API)
  try {
    riskLoading.value = true
    riskError.value = ''
    const analysis = await getUpcomingIpoRiskAnalysis(targetId)
    riskAnalysis.value = analysis?.analysisText || ''
  } catch (error) {
    console.error('위험 분석 로드 실패:', error)
    riskError.value = '위험 분석 데이터를 불러오지 못했습니다.'
    riskAnalysis.value = ''
  } finally {
    riskLoading.value = false
  }
}

// --- [차트 1] 실적 추이 렌더링 ---
const renderPerfChart = () => {
  if (!performanceChartRef.value || !company.value?.financials) return
  if (perfChartInst) perfChartInst.dispose()

  perfChartInst = echarts.init(performanceChartRef.value)

  const metricKey = selectedPerfMetric.value === '매출액' ? 'revenue'
      : selectedPerfMetric.value === '영업이익' ? 'opProfit' : 'netIncome'

  const data = company.value.financials[metricKey] || []
  const labels = company.value.financials.quarters || []

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const item = params[0];
        const val = item.value;
        // [핵심 수정] item.color를 사용하여 현재 막대 색상(파랑/빨강)을 그대로 가져옴
        const color = item.color;

        return `${item.name}<br/>
                <span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span>
                ${selectedPerfMetric.value}: <b>${val.toLocaleString()}</b> 백만원`
      }
    },
    grid: {top: '20px', left: '2%', right: '2%', bottom: '20px', containLabel: true},
    xAxis: {
      type: 'category',
      data: labels,
      axisTick: {show: false},
      axisLine: {show: true, lineStyle: {color: '#E5E8EB'}, onZero: true},
      axisLabel: {color: '#6B7684', fontSize: 11, margin: 15}
    },
    yAxis: { show: false, type: 'value', scale: true },
    series: [{
      name: selectedPerfMetric.value,
      type: 'bar',
      data: data,
      barWidth: 20,
      itemStyle: {
        // 양수: 파랑(#3182F6), 음수: 빨강(#EF4444)
        color: (p) => p.value >= 0 ? '#3182F6' : '#EF4444',
        borderRadius: [4, 4, 4, 4]
      },
      label: { show: false }
    }]
  }
  perfChartInst.setOption(option)
}

// --- [차트 2] 유사 기업 분석 렌더링 ---
const renderDeepChart = () => {
  if (!deepAnalysisChartRef.value || !company.value?.deepMetrics || !company.value?.peers) return
  if (deepChartInst) deepChartInst.dispose()

  deepChartInst = echarts.init(deepAnalysisChartRef.value)
  const category = company.value.deepMetrics[selectedDeepCategory.value]

  if (!category || !category.data[selectedDeepMetric.value]) return

  const metricData = category.data[selectedDeepMetric.value]
  const peerId = selectedPeerId.value
  const peerName = company.value.peers.find(p => p.id === peerId)?.name || '경쟁사'

  const option = {
    tooltip: {trigger: 'axis'},
    legend: {bottom: 0, icon: 'circle'},
    grid: {top: '10%', left: '5%', right: '5%', bottom: '15%', containLabel: true},
    xAxis: {type: 'category', data: ['23년', '24년', '25년(E)'], axisLine: {show: false}, axisTick: {show: false}},
    yAxis: {type: 'value', splitLine: {lineStyle: {color: '#F2F4F6'}}},
    series: [
      {
        name: company.value.basic.name,
        type: 'line',
        data: metricData.target,
        symbol: 'circle', symbolSize: 6,
        itemStyle: {color: '#3182F6'},
        lineStyle: {width: 3}
      },
      {
        name: peerName,
        type: 'line',
        data: metricData.peers?.[peerId] || [],
        symbol: 'circle', symbolSize: 6,
        itemStyle: {color: '#EF4444'},
        lineStyle: {width: 3}
      },
      {
        name: '업계평균',
        type: 'line',
        data: metricData.avg || [],
        symbol: 'none',
        itemStyle: {color: '#B0B8C1'},
        lineStyle: {type: 'dashed'}
      }
    ]
  }
  deepChartInst.setOption(option)
}

// --- 유틸리티 ---
const getRiskLevelInfo = (grade) => {
  const maps = {
    'SAFE': {label: '안전', color: 'text-green-600', bg: 'bg-green-50', icon: '🟢'},
    'CAUTION': {label: '주의', color: 'text-amber-600', bg: 'bg-amber-50', icon: '🟡'},
    'DANGER': {label: '위험', color: 'text-red-600', bg: 'bg-red-50', icon: '🔴'}
  }
  return maps[grade] || maps['CAUTION']
}

// --- 생명주기 ---
onMounted(() => {
  fetchCompanyDetail(id)
  window.addEventListener('resize', () => {
    perfChartInst?.resize();
    deepChartInst?.resize()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', () => {})
})

// --- Watchers ---
watch(selectedPerfMetric, renderPerfChart)

watch(selectedDeepCategory, (newVal) => {
  if (company.value?.deepMetrics) {
    selectedDeepMetric.value = company.value.deepMetrics[newVal].items[0].key
  }
})

watch([selectedDeepCategory, selectedDeepMetric, selectedPeerId], renderDeepChart)
</script>

<template>
  <div class="min-h-screen bg-[#F2F4F6] pb-24 font-sans text-[#333D4B]">

    <div v-if="isLoading" class="flex flex-col items-center justify-center min-h-screen">
      <div class="animate-spin h-8 w-8 border-4 border-[#3182F6] border-t-transparent rounded-full mb-4"></div>
      <p class="text-[#8B95A1] font-medium">데이터 분석 중...</p>
    </div>

    <div v-else-if="isError" class="flex flex-col items-center justify-center min-h-screen px-10 text-center">
      <p class="text-[#EF4444] font-bold mb-4">데이터를 불러오지 못했습니다.</p>
      <button @click="fetchCompanyDetail(id)"
              class="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm shadow-sm">다시 시도
      </button>
    </div>

    <div v-else-if="company">
      <header class="bg-white/90 sticky top-0 z-20 border-b border-[#F2F4F6] backdrop-blur-md">
        <div class="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <button @click="router.back()" class="p-2 -ml-2 hover:bg-gray-100 rounded-full shrink-0">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <router-link to="/" class="shrink-0">
            <img src="/ipo_check_logo.png" alt="IPO CHECK" class="h-6 object-contain" />
          </router-link>
          <h1 class="text-[18px] font-bold flex items-center gap-2 min-w-0 flex-1 truncate">
            {{ company.basic?.name }}
            <span class="text-[11px] font-medium text-[#8B95A1] bg-[#F2F4F6] px-1.5 py-0.5 rounded-md">
              {{ company.basic?.code }}
            </span>
          </h1>
        </div>
      </header>

      <main class="max-w-2xl mx-auto px-5 py-6 space-y-5">

        <section v-if="company.basic" class="bg-white rounded-[24px] p-6 shadow-sm">
          <h2 class="text-[19px] font-bold mb-5">핵심 정보</h2>
          <div class="space-y-4 text-[15px]">
            <div class="flex justify-between items-start">
              <span class="text-[#8B95A1] shrink-0">주요제품</span>
              <span class="font-medium text-right break-keep">{{ company.basic.products }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[#8B95A1]">희망공모가</span>
              <span class="font-bold text-[#3182F6]">{{ company.basic.expectedPrice }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[#8B95A1]">확정공모가</span>
              <span class="font-bold text-[18px]">{{ company.basic.finalPrice }}</span>
            </div>
            <div class="h-[1px] bg-[#F2F4F6]"></div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-[13px] text-[#8B95A1] mb-1">공모주식수</p>
                <p class="font-semibold">{{ company.basic.publicShares }}</p>
              </div>
              <div>
                <p class="text-[13px] text-[#8B95A1] mb-1">일반청약</p>
                <p class="font-semibold">{{ company.basic.generalShares }}</p>
              </div>
            </div>
            <div>
              <p class="text-[13px] text-[#8B95A1] mb-2">주관사</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="uw in (company.basic.underwriter?.split(', ') || [])" :key="uw"
                      class="bg-[#F2F4F6] px-3 py-1 rounded-lg text-[13px] font-bold text-[#4E5968]">
                  {{ uw }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="company.basic?.schedule" class="bg-white rounded-[24px] p-6 shadow-sm">
          <h2 class="text-[19px] font-bold mb-6">진행 일정</h2>
          <div class="relative pl-2">
            <div v-for="(item, idx) in company.basic.schedule" :key="idx" class="relative pb-8 last:pb-0">
              <div v-if="idx < company.basic.schedule.length - 1"
                   class="absolute left-[5px] top-5 bottom-0 w-[1px] bg-[#E5E8EB]"></div>
              <div class="flex items-start gap-4">
                <div class="relative z-10 h-5 flex items-center justify-center">
                  <div class="w-[11px] h-[11px] rounded-full transition-colors duration-300"
                       :class="{ 'bg-[#B0B8C1]': item.status === 'done', 'bg-[#3182F6] ring-4 ring-blue-50': item.status === 'active', 'bg-white border-2 border-[#E5E8EB]': item.status === 'future' }">
                  </div>
                </div>
                <div class="flex-1 flex justify-between h-5">
                  <span :class="item.status === 'active' ? 'text-[#3182F6] font-bold' : 'text-[#4E5968]'">
                    {{ item.step }}
                  </span>
                  <span :class="item.status === 'active' ? 'text-[#3182F6] font-bold' : 'text-[#8B95A1]'">
                    {{ item.date }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="company.financials" class="bg-white rounded-[24px] p-6 shadow-sm">
          <h2 class="text-[19px] font-bold mb-2">실적 추이</h2>
          <p class="text-[12px] text-[#8B95A1] mb-4 text-right">(단위: 백만원)</p>

          <div class="flex bg-[#F2F4F6] p-1 rounded-xl mb-6">
            <button v-for="tab in ['매출액', '영업이익', '순이익']" :key="tab"
                    @click="selectedPerfMetric = tab"
                    class="flex-1 py-2 text-[13px] font-bold rounded-lg transition-all"
                    :class="selectedPerfMetric === tab ? 'bg-white shadow-sm text-[#333D4B]' : 'text-[#8B95A1] hover:text-[#4E5968]'">
              {{ tab }}
            </button>
          </div>

          <div ref="performanceChartRef" style="width: 100%; height: 250px;"></div>
        </section>

        <section v-if="company.deepMetrics" class="bg-white rounded-[24px] p-6 shadow-sm">
          <h2 class="text-[19px] font-bold mb-5">유사 기업 분석</h2>

          <div class="flex border-b mb-5">
            <button v-for="(cat, key) in company.deepMetrics" :key="key" @click="selectedDeepCategory = key"
                    class="flex-1 pb-3 text-[15px] font-bold border-b-2 transition-colors"
                    :class="selectedDeepCategory === key ? 'border-[#333D4B] text-[#333D4B]' : 'border-transparent text-[#B0B8C1]'">
              {{ cat.label }}
            </button>
          </div>

          <div class="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            <button v-for="item in company.deepMetrics[selectedDeepCategory].items" :key="item.key"
                    @click="selectedDeepMetric = item.key"
                    class="px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors"
                    :class="selectedDeepMetric === item.key ? 'bg-[#3182F6] text-white' : 'bg-[#F2F4F6] text-[#6B7684]'">
              {{ item.name }}
            </button>
          </div>

          <div class="flex justify-end mb-2">
            <select v-model="selectedPeerId"
                    class="bg-[#F2F4F6] border-none text-[12px] font-bold rounded-lg px-2 py-1 outline-none text-[#333D4B]">
              <option v-for="p in company.peers" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <div ref="deepAnalysisChartRef" style="width: 100%; height: 300px;"></div>
        </section>

        <section v-if="company.valuation" class="bg-white rounded-[24px] p-6 shadow-sm">
          <h2 class="text-[19px] font-bold mb-5">적정 주가 산출</h2>

          <div class="flex bg-[#F2F4F6] p-1 rounded-xl mb-6">
            <button v-for="(scen, key) in company.valuation" :key="key"
                    @click="selectedValuationScenario = key"
                    class="flex-1 py-2 rounded-lg text-[13px] font-bold"
                    :class="selectedValuationScenario === key ? 'bg-white shadow-sm text-[#3182F6]' : 'text-[#8B95A1]'">
              {{ key === 'conservative' ? '보수적' : key === 'standard' ? '시장표준' : '공격적' }}
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <h3 class="font-bold text-[#191F28]">{{ company.valuation[selectedValuationScenario].modelName }}</h3>
              <p class="text-[13px] text-[#6B7684] mt-1 break-keep">
                {{ company.valuation[selectedValuationScenario].desc }}
              </p>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-[32px] font-bold text-[#333D4B]">
                {{ company.valuation[selectedValuationScenario].price }}
              </span>
              <span class="text-[15px] font-bold"
                    :class="company.valuation[selectedValuationScenario].gap.includes('+') ? 'text-[#EF4444]' : 'text-[#3182F6]'">
                {{ company.valuation[selectedValuationScenario].gap }}
              </span>
            </div>
            <div class="bg-[#F9FAFB] p-4 rounded-xl border border-gray-100">
              <p class="text-[11px] text-[#8B95A1] mb-2 uppercase font-bold">Formula</p>
              <p class="text-[13px] font-mono font-medium text-center py-3 bg-white rounded-lg border border-[#E5E8EB] text-[#333D4B]">
                {{ company.valuation[selectedValuationScenario].formula }}
              </p>
            </div>
          </div>
        </section>

        <section v-if="company.riskReport || riskLoading || riskAnalysis" class="bg-white rounded-[24px] p-6 shadow-sm mb-10 overflow-hidden relative">
          <div class="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          <h2 class="text-[19px] font-bold text-[#191F28] mb-6 flex items-center gap-2 relative z-10">
            <span class="bg-blue-100 p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#3182F6]" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </span>
            핵심 투자 위험 분석
          </h2>

          <div v-if="company.riskReport" class="bg-gray-50 rounded-[20px] p-5 mb-5 border border-gray-100">
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
                <span class="text-3xl filter drop-shadow-sm">{{
                    getRiskLevelInfo(company.riskReport.grade).icon
                  }}</span>
              </div>
            </div>

            <p class="text-[13px] text-[#4E5968] leading-snug">
              {{ getRiskLevelInfo(company.riskReport.grade).desc }}
            </p>
          </div>

          <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-[12px] font-bold text-[#3182F6]">AI 요약</span>
                <span class="text-[10px] text-[#6B7684] bg-blue-50 px-2 py-0.5 rounded-full">내부 공시 기반</span>
              </div>
              <span class="text-[10px] text-[#B0B8C1]">자동 분석</span>
            </div>

            <div
                class="rounded-[18px] border border-[#E6EDF5] bg-gradient-to-b from-white to-[#F8FAFC] shadow-[0_8px_24px_rgba(0,0,0,0.04)] overflow-hidden">
              <div
                  class="flex items-center justify-between px-4 py-3 border-b border-[#EDF2F7] bg-white/80 backdrop-blur">
                <div class="flex items-center gap-2">
                  <span
                      class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-[#3182F6] text-[12px] font-bold">AI</span>
                  <span class="text-[13px] font-bold text-[#191F28]">핵심 투자 위험 해석</span>
                </div>
                <span class="text-[10px] text-[#8B95A1]">요약·해석</span>
              </div>

              <div class="p-4">
                <div v-if="riskLoading" class="flex items-center gap-2 text-[13px] text-[#8B95A1]">
                  <svg class="animate-spin h-4 w-4 text-[#3182F6]" xmlns="http://www.w3.org/2000/svg" fill="none"
                       viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  분석 생성 중...
                </div>
                <div v-else-if="riskError" class="text-[13px] text-[#EF4444]">
                  {{ riskError }}
                </div>
                <template v-else>
                  <div class="space-y-5">
                    <div>
                      <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                          <span
                              class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-[#3182F6] text-[11px] font-bold">✓</span>
                          <h4 class="text-[14px] font-bold text-[#1F2A37] font-serif">핵심 투자 리스크 요약</h4>
                        </div>
                        <span class="text-[10px] text-[#8B95A1]">Summary</span>
                      </div>
                      <ul class="space-y-2">
                        <li v-for="(item, idx) in analysisSections.summaryItems" :key="idx"
                            class="bg-white rounded-[12px] border border-[#EEF2F6] px-3 py-2 text-[13px] md:text-[14px] text-[#333D4B] leading-6 whitespace-pre-wrap">
                          <div class="flex items-start gap-2">
                            <span class="text-[#3182F6] font-extrabold text-[14px] md:text-[15px] mt-[1px]">{{
                                idx + 1
                              }}.</span>
                            <div>
                              <p class="text-[14px] md:text-[15px] font-bold text-[#1F2A37] leading-6">{{
                                  item.title
                                }}</p>
                              <p v-if="item.body"
                                 class="text-[13px] md:text-[14px] text-[#4B5563] leading-6 whitespace-pre-wrap">
                                {{ item.body }}</p>
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 class="text-[13px] font-bold text-[#111827] font-mono mb-2">종합 판단</h4>
                      <p class="text-[13px] md:text-[14px] text-[#374151] leading-7 tracking-[-0.2px] whitespace-pre-wrap font-sans">
                        {{ analysisSections.judgmentText }}
                      </p>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div v-if="company.riskReport?.aiSummary" class="space-y-3">
            <div v-for="(s, i) in company.riskReport.aiSummary" :key="i"
                 class="flex gap-3 items-start bg-white p-3 rounded-xl border border-[#F2F4F6]">
              <span class="text-[#3182F6] font-bold text-lg leading-none mt-0.5">Q.</span>
              <p class="text-[14px] leading-relaxed text-[#4E5968]">{{ s }}</p>
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
<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const corpId = route.params.id

// --- 상태 관리 ---
const company = ref(null)
const isLoading = ref(true)
const isError = ref(false)

// --- 차트 DOM 참조 ---
const performanceChartRef = ref(null)
const deepAnalysisChartRef = ref(null)
let perfChartInst = null
let deepChartInst = null

// --- 필터 상태 ---
const selectedPerfMetric = ref('매출액')       // 실적 차트 탭
const selectedDeepCategory = ref('growth')   // 유사 기업 분석 카테고리
const selectedDeepMetric = ref('')           // 유사 기업 분석 세부 지표
const selectedPeerId = ref(null)             // 유사 기업 선택
const selectedValuationScenario = ref('standard')

const API_BASE_URL = 'http://localhost:8080/api'

// --- 데이터 가져오기 ---
const fetchCompanyDetail = async (id) => {
  try {
    isLoading.value = true
    isError.value = false

    // API 호출
    const response = await axios.get(`${API_BASE_URL}/upcoming-ipo/${id}/financials`)
    company.value = response.data

    // 데이터 로드 후 초기값 설정
    if (company.value) {
      // 1. 심층 지표 초기값
      if (company.value.deepMetrics?.[selectedDeepCategory.value]?.items?.length > 0) {
        selectedDeepMetric.value = company.value.deepMetrics[selectedDeepCategory.value].items[0].key
      }
      // 2. 유사 기업 초기값
      if (company.value.peers?.length > 0) {
        selectedPeerId.value = company.value.peers[0].id
      }
    }

    // ✨ [핵심 수정] DOM 생성 대기 시간을 더 안전하게 확보 (setTimeout)
    // 데이터가 세팅되고 v-if가 풀리면서 DOM이 생길 때까지 확실히 기다립니다.
    await nextTick()
    setTimeout(() => {
      if (company.value?.financials) {
        renderPerfChart()
      }
      if (company.value?.deepMetrics) {
        renderDeepChart()
      }
    }, 50)

  } catch (error) {
    console.error('데이터 로드 실패:', error)
    isError.value = true
  } finally {
    isLoading.value = false
  }
}

// --- [차트 1] 실적 추이 렌더링 ---
const renderPerfChart = () => {
  if (!performanceChartRef.value || !company.value?.financials) return

  if (perfChartInst) {
    perfChartInst.dispose()
  }

  perfChartInst = echarts.init(performanceChartRef.value)

  const metricKey = selectedPerfMetric.value === '매출액' ? 'revenue'
      : selectedPerfMetric.value === '영업이익' ? 'opProfit' : 'netIncome'

  const data = company.value.financials[metricKey] || []
  const labels = company.value.financials.quarters || []

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const val = params[0].value;
        return `${params[0].name}<br/>
                <span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:#3182F6;"></span>
                ${selectedPerfMetric.value}: <b>${val.toLocaleString()}</b> 백만원`
      }
    },
    // Y축이 없으므로 왼쪽 여백 최소화
    grid: {top: '20px', left: '2%', right: '2%', bottom: '20px', containLabel: true},
    xAxis: {
      type: 'category',
      data: labels,
      axisTick: {show: false},
      // 0선(Zero Line)을 명확하게 표시
      axisLine: {show: true, lineStyle: {color: '#E5E8EB'}, onZero: true},
      axisLabel: {color: '#6B7684', fontSize: 11, margin: 15}
    },
    yAxis: {
      show: false, // Y축 숨김
      type: 'value',
      scale: true
    },
    series: [{
      name: selectedPerfMetric.value,
      type: 'bar',
      data: data,
      barWidth: 20,
      itemStyle: {
        color: (p) => p.value >= 0 ? '#3182F6' : '#EF4444',
        borderRadius: [4, 4, 4, 4]
      },
      label: {
        show: false // ✨ 차트 위 숫자(라벨) 제거 요청 반영
      }
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
  fetchCompanyDetail(corpId)
  window.addEventListener('resize', () => {
    perfChartInst?.resize();
    deepChartInst?.resize()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', () => {
  })
})

// --- Watchers ---
watch(selectedPerfMetric, () => {
  renderPerfChart()
})

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
      <button @click="fetchCompanyDetail(corpId)"
              class="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm shadow-sm">다시 시도
      </button>
    </div>

    <div v-else-if="company">
      <header class="bg-white/90 sticky top-0 z-20 border-b border-[#F2F4F6] backdrop-blur-md">
        <div class="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <button @click="router.back()" class="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 class="text-[18px] font-bold flex items-center gap-2">
            {{ company.basic?.name }}
            <span class="text-[11px] font-medium text-[#8B95A1] bg-[#F2F4F6] px-1.5 py-0.5 rounded-md">{{
                company.basic?.code
              }}</span>
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
            <div class="flex justify-between items-center"><span class="text-[#8B95A1]">희망공모가</span><span
                class="font-bold text-[#3182F6]">{{ company.basic.expectedPrice }}</span></div>
            <div class="flex justify-between items-center"><span class="text-[#8B95A1]">확정공모가</span><span
                class="font-bold text-[18px]">{{ company.basic.finalPrice }}</span></div>
            <div class="h-[1px] bg-[#F2F4F6]"></div>
            <div class="grid grid-cols-2 gap-4">
              <div><p class="text-[13px] text-[#8B95A1] mb-1">공모주식수</p>
                <p class="font-semibold">{{ company.basic.publicShares }}</p></div>
              <div><p class="text-[13px] text-[#8B95A1] mb-1">일반청약</p>
                <p class="font-semibold">{{ company.basic.generalShares }}</p></div>
            </div>
            <div>
              <p class="text-[13px] text-[#8B95A1] mb-2">주관사</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="uw in (company.basic.underwriter?.split(', ') || [])" :key="uw"
                      class="bg-[#F2F4F6] px-3 py-1 rounded-lg text-[13px] font-bold text-[#4E5968]">{{ uw }}</span>
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
                       :class="{ 'bg-[#B0B8C1]': item.status === 'done', 'bg-[#3182F6] ring-4 ring-blue-50': item.status === 'active', 'bg-white border-2 border-[#E5E8EB]': item.status === 'future' }"></div>
                </div>
                <div class="flex-1 flex justify-between h-5">
                  <span :class="item.status === 'active' ? 'text-[#3182F6] font-bold' : 'text-[#4E5968]'">{{
                      item.step
                    }}</span>
                  <span :class="item.status === 'active' ? 'text-[#3182F6] font-bold' : 'text-[#8B95A1]'">{{
                      item.date
                    }}</span>
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
              <p class="text-[13px] text-[#6B7684] mt-1 break-keep">{{
                  company.valuation[selectedValuationScenario].desc
                }}</p>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-[32px] font-bold text-[#333D4B]">{{
                  company.valuation[selectedValuationScenario].price
                }}</span>
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

        <section v-if="company.riskReport" class="bg-white rounded-[24px] p-6 shadow-sm mb-10">
          <h2 class="text-[19px] font-bold mb-6">투자 위험 분석</h2>
          <div class="bg-gray-50 rounded-2xl p-5 mb-6 flex justify-between items-center border border-gray-100">
            <div>
              <p class="text-[13px] text-[#8B95A1] mb-1">AI 종합 진단</p>
              <h3 class="text-[22px] font-bold flex items-center gap-2"
                  :class="getRiskLevelInfo(company.riskReport.grade).color">
                {{ getRiskLevelInfo(company.riskReport.grade).label }}
                <span
                    class="text-[13px] bg-white px-2 py-0.5 rounded-full border border-gray-200 text-[#4E5968] font-medium">Score {{
                    company.riskReport.score
                  }}</span>
              </h3>
            </div>
            <span class="text-3xl filter drop-shadow-sm">{{ getRiskLevelInfo(company.riskReport.grade).icon }}</span>
          </div>
          <div class="space-y-3">
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
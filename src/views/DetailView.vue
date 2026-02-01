<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'

const route = useRoute()
const router = useRouter()

// --- 차트 DOM 참조 ---
const performanceChartRef = ref(null)
const deepAnalysisChartRef = ref(null)
let perfChartInst = null
let deepChartInst = null

// --- 상태 관리 ---
const selectedPerfMetric = ref('매출액')
const selectedDeepCategory = ref('growth')
const selectedDeepMetric = ref('')
const selectedPeerId = ref(null)
const selectedValuationScenario = ref('standard')

// --- 목업 데이터 (데이터는 동일) ---
const companyData = {
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
      {id: 101, name: '네이버페이', info: 'PER 25.4배'},
      {id: 102, name: '토스', info: 'PER - 배'},
      {id: 103, name: '뱅크샐러드', info: 'PER 18.2배'}
    ],
    deepMetrics: {
      growth: {
        label: '성장성',
        items: [
          {key: 'revGrowth', name: '매출액증가율', unit: '%'},
          {key: 'niGrowth', name: '순이익증가율', unit: '%'},
          {key: 'assetGrowth', name: '총자산증가율', unit: '%'}
        ],
        data: {
          revGrowth: {
            target: [10, 12, 15, 18, 22, 25],
            avg: [9, 9, 10, 10, 11, 12],
            peers: {101: [10, 11, 12, 14, 15, 16], 102: [25, 28, 30, 35, 40, 42], 103: [4, 5, 5, 6, 5, 4]}
          },
          niGrowth: {
            target: [0, 2, 5, 10, 15, 20],
            avg: [7, 8, 8, 8, 9, 9],
            peers: {101: [9, 9, 10, 11, 12, 12], 102: [-15, -12, -10, -5, 0, 5], 103: [1, 2, 2, 3, 2, 1]}
          },
          assetGrowth: {
            target: [6, 7, 8, 9, 10, 12],
            avg: [5, 5, 5, 5, 5, 5],
            peers: {101: [6, 6, 7, 7, 8, 8], 102: [22, 21, 20, 18, 15, 12], 103: [3, 3, 3, 3, 3, 3]}
          }
        }
      },
      profit: {
        label: '수익성',
        items: [
          {key: 'gpm', name: '매출총이익률', unit: '%'},
          {key: 'opm', name: '영업이익률', unit: '%'},
          {key: 'roe', name: 'ROE', unit: '%'}
        ],
        data: {
          gpm: {
            target: [38, 39, 40, 42, 45, 46],
            avg: [34, 34, 35, 35, 35, 35],
            peers: {101: [37, 37, 38, 39, 40, 40], 102: [15, 18, 20, 25, 30, 35], 103: [30, 30, 30, 30, 30, 30]}
          },
          opm: {
            target: [8, 9, 10, 12, 15, 18],
            avg: [7, 7, 8, 8, 8, 8],
            peers: {101: [14, 14, 15, 15, 16, 16], 102: [-8, -6, -5, -2, 1, 3], 103: [5, 5, 5, 5, 4, 4]}
          },
          roe: {
            target: [3, 4, 5, 7, 9, 12],
            avg: [5, 5, 6, 6, 6, 6],
            peers: {101: [9, 9, 10, 10, 11, 11], 102: [-20, -18, -15, -10, -5, 0], 103: [3, 3, 3, 3, 3, 3]}
          }
        }
      },
      stability: {
        label: '안정성',
        items: [
          {key: 'debtRatio', name: '부채비율', unit: '%'},
          {key: 'intCov', name: '이자보상배율', unit: '배'},
          {key: 'capRatio', name: '자기자본비율', unit: '%'}
        ],
        data: {
          debtRatio: {
            target: [130, 125, 120, 115, 110, 105],
            avg: [100, 100, 100, 100, 100, 100],
            peers: {101: [95, 92, 90, 85, 80, 80], 102: [220, 210, 200, 180, 160, 150], 103: [50, 50, 50, 50, 50, 50]}
          },
          intCov: {
            target: [2, 2.5, 3, 4, 5, 6],
            avg: [5, 5, 5, 5, 5, 5],
            peers: {101: [7, 7, 8, 8, 9, 9], 102: [0.2, 0.4, 0.5, 0.8, 1.0, 1.2], 103: [10, 10, 10, 10, 10, 10]}
          },
          capRatio: {
            target: [35, 38, 40, 42, 45, 48],
            avg: [50, 50, 50, 50, 50, 50],
            peers: {101: [58, 59, 60, 60, 60, 60], 102: [15, 18, 20, 25, 30, 35], 103: [70, 70, 70, 70, 70, 70]}
          }
        }
      }
    },
    valuation: {
      conservative: {
        label: '보수적 시나리오',
        price: '20,000원',
        gap: '-23%',
        basis: '시장 침체 및 규제 강화를 가정한 보수적 접근입니다.',
        per: '15.0배',
        netIncome: '800억 원',
        shares: '5,000만 주',
        formula: '(800억 × 15배) / 5,000만 주 = 24,000원'
      },
      standard: {
        label: '시장표준 시나리오',
        price: '20,000원',
        gap: '+33%',
        basis: '유사 기업 평균 PER 20배를 적용한 가장 합리적인 목표가입니다.',
        per: '20.0배',
        netIncome: '1,000억 원',
        shares: '5,000만 주',
        formula: '(1,000억 × 20배) / 5,000만 주 = 20,000원'
      },
      aggressive: {
        label: '공격적 시나리오',
        price: '32,000원',
        gap: '+23%',
        basis: '신사업 확장 및 시장 호황을 가정한 공격적 접근입니다.',
        per: '25.0배',
        netIncome: '1,200억 원',
        shares: '5,000만 주',
        formula: '(1,200억 × 25배) / 5,000만 주 = 32,000원'
      }
    },
    risks: [
      {title: '유통물량 주의 (40%)', desc: '상장 직후 오버행 이슈 발생 가능성'},
      {title: '규제 리스크', desc: '금융소비자보호법 강화에 따른 매출 영향'},
      {title: '금리 인상', desc: '조달 금리 상승으로 인한 이자 비용 증가'}
    ]
  }
}

const company = computed(() => companyData[1])
const formatNum = (n) => n ? n.toLocaleString() : '-'

// --- 차트 렌더링 함수 (토스 스타일 적용) ---
const renderPerfChart = () => {
  if (!performanceChartRef.value) return
  if (perfChartInst) perfChartInst.dispose()

  perfChartInst = echarts.init(performanceChartRef.value)
  const metricKey = selectedPerfMetric.value === '매출액' ? 'revenue'
      : selectedPerfMetric.value === '영업이익' ? 'opProfit' : 'netIncome'
  const data = company.value.financials[metricKey]
  const color = selectedPerfMetric.value === '순이익' ? '#EF4444' : '#3182F6'

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
      axisLabel: {color: '#8B95A1', fontSize: 11, margin: 12} // 라벨 여백 확보
    },
    yAxis: {
      type: 'value',
      splitLine: {lineStyle: {type: 'dashed', color: '#E5E8EB', width: 0.8}}, // 더 연한 점선
      axisLabel: {show: false}
    },
    series: [{
      name: selectedPerfMetric.value,
      type: 'bar',
      data: data,
      barWidth: 20, // 조금 더 얇게
      itemStyle: {color: color, borderRadius: [6, 6, 6, 6]}, // 완전 둥근 바
      label: {
        show: true,
        position: 'top',
        formatter: (p) => formatNum(p.value),
        fontSize: 11,
        fontWeight: 600,
        color: '#4E5968'
      }
    }]
  }
  perfChartInst.setOption(option)
}

const renderDeepChart = () => {
  if (!deepAnalysisChartRef.value) return
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
      axisLine: {show: false}, // 축 선 제거
      axisTick: {show: false},
      axisLabel: {color: '#8B95A1', fontSize: 11}
    },
    yAxis: {type: 'value', splitLine: {lineStyle: {color: '#F2F4F6'}}},
    series: [
      {
        name: company.value.name, type: 'line', data: metricData.target,
        symbol: 'circle', symbolSize: 8, // 심볼 키움
        itemStyle: {color: '#3182F6', borderColor: '#fff', borderWidth: 2}, // 흰색 테두리 심볼
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

onMounted(() => {
  selectedDeepMetric.value = company.value.deepMetrics.growth.items[0].key
  selectedPeerId.value = company.value.peers[0].id
  nextTick(() => {
    renderPerfChart();
    renderDeepChart()
  })
  window.addEventListener('resize', () => {
    perfChartInst?.resize();
    deepChartInst?.resize()
  })
})
watch(selectedPerfMetric, renderPerfChart)
watch(selectedDeepCategory, (newVal) => {
  selectedDeepMetric.value = company.value.deepMetrics[newVal].items[0].key
})
watch([selectedDeepCategory, selectedDeepMetric, selectedPeerId], renderDeepChart)
</script>

<template>
  <div class="min-h-screen bg-[#F2F4F6] pb-24 font-sans text-[#333D4B]">

    <header class="bg-white sticky top-0 z-20 border-b border-[#F2F4F6]/50 backdrop-blur-md bg-white/90">
      <div class="max-w-2xl mx-auto px-5 py-3 flex items-center gap-2">
        <button @click="router.back()"
                class="p-1 -ml-1 text-[#333D4B] hover:bg-gray-100 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"
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
                <div class="w-[11px] h-[11px] rounded-full flex items-center justify-center transition-all duration-300"
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
               class="bg-[#F9FAFB] rounded-[16px] p-4 flex flex-col items-center text-center border border-transparent hover:border-blue-100 transition-colors">
            <span
                class="w-6 h-6 rounded-full bg-white text-[12px] font-bold flex items-center justify-center text-[#3182F6] shadow-sm mb-2 border border-gray-50">
              {{ String.fromCharCode(65 + idx) }}
            </span>
            <p class="text-[14px] font-bold text-[#333D4B] mb-0.5">{{ peer.name }}</p>
            <p class="text-[11px] text-[#8B95A1]">{{ peer.info }}</p>
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
          <h3 class="text-[15px] font-bold text-[#333D4B] mb-1">
            {{ company.valuation[selectedValuationScenario].label }}
          </h3>
          <p class="text-[13px] text-[#8B95A1] mb-4">
            {{ company.valuation[selectedValuationScenario].basis }}
          </p>

          <div class="flex items-end gap-2 mb-6">
            <span class="text-[32px] font-bold text-[#333D4B] leading-none">
              {{ company.valuation[selectedValuationScenario].price }}
            </span>
            <span class="text-[14px] font-bold mb-1"
                  :class="company.valuation[selectedValuationScenario].gap.includes('+') ? 'text-[#EF4444]' : 'text-[#3182F6]'">
              {{ company.valuation[selectedValuationScenario].gap }}
            </span>
          </div>

          <div class="bg-[#F9FAFB] rounded-[16px] p-5 border border-[#F2F4F6]">
            <div class="space-y-3 text-[13px]">
              <div class="flex justify-between">
                <span class="text-[#8B95A1]">적용 멀티플</span>
                <span class="font-bold text-[#333D4B]">{{ company.valuation[selectedValuationScenario].per }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#8B95A1]">26년 예상 순이익</span>
                <span class="font-bold text-[#333D4B]">{{
                    company.valuation[selectedValuationScenario].netIncome
                  }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[#8B95A1]">주식 수</span>
                <span class="font-bold text-[#333D4B]">{{ company.valuation[selectedValuationScenario].shares }}</span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-[#E5E8EB]">
              <p class="text-[11px] text-[#8B95A1] mb-1">산출 공식</p>
              <p class="text-[12px] font-medium text-[#4E5968] bg-white px-3 py-2 rounded-[8px] border border-[#F2F4F6] inline-block">
                {{ company.valuation[selectedValuationScenario].formula }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-[24px] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        <h2 class="text-[19px] font-bold text-[#333D4B] mb-5 flex items-center gap-2">
          <span class="bg-red-100 p-1 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#EF4444]" viewBox="0 0 20 20"
                 fill="currentColor">
              <path fill-rule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clip-rule="evenodd"/>
            </svg>
          </span>
          체크 포인트
        </h2>
        <div class="space-y-3">
          <div v-for="(risk, idx) in company.risks" :key="idx"
               class="bg-[#FEF2F2] rounded-[16px] p-4 border border-transparent hover:border-red-100 transition-colors">
            <div class="flex items-start gap-3">
              <span
                  class="bg-white text-[#EF4444] w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm mt-0.5 shrink-0">
                {{ idx + 1 }}
              </span>
              <div>
                <h3 class="text-[14px] font-bold text-[#191F28] mb-1">{{ risk.title }}</h3>
                <p class="text-[13px] text-[#5F6E76] leading-relaxed">{{ risk.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
/* 스크롤바 숨김 */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
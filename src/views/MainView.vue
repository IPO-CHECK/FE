<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const ipoList = ref([
  {
    id: 1, // corporation ID
    name: '카카오페이',
    industry: '핀테크',
    underwriter: '삼성증권, 대신증권',
    subDate: '2026.02.05 ~ 02.06',
    listDate: '2026.02.15',
    status: '청약예정',
    price: '26,000원'
  },
  {
    id: 2,
    name: '크래프톤',
    industry: '게임',
    underwriter: '미래에셋증권',
    subDate: '2026.01.20 ~ 01.21',
    listDate: '2026.01.31',
    status: '상장완료',
    price: '49,000원'
  },
  {
    id: 3,
    name: '하이브',
    industry: '엔터테인먼트',
    underwriter: 'NH투자증권, 한국투자증권, 제이피모간',
    subDate: '2026.01.10 ~ 01.11',
    listDate: '2026.01.22',
    status: '상장완료',
    price: '-'
  },
  {
    id: 4,
    name: '당근마켓',
    industry: '이커머스',
    underwriter: 'KB증권, 모건스탠리',
    subDate: '2025.12.20 ~ 12.21',
    listDate: '2026.01.02',
    status: '상장완료',
    price: '-'
  },
  {
    id: 6,
    name: '메디트',
    industry: '헬스케어',
    underwriter: '한국투자증권',
    subDate: '2025.12.10 ~ 12.11',
    listDate: '2025.12.22',
    status: '상장완료',
    price: '18,500원'
  },
  {
    id: 9,
    name: 'LG CNS',
    industry: 'IT서비스',
    underwriter: 'KB증권, 뱅크오브아메리카, 신한투자증권',
    subDate: '2025.11.05 ~ 11.06',
    listDate: '2025.11.15',
    status: '상장완료',
    price: '-'
  },
  {
    id: 10,
    name: 'CJ올리브영',
    industry: '유통/뷰티',
    underwriter: '미래에셋증권, 모건스탠리',
    subDate: '2025.10.25 ~ 10.26',
    listDate: '2025.11.05',
    status: '상장완료',
    price: '-'
  },
  {
    id: 11,
    name: 'DN솔루션즈',
    industry: '기계/장비',
    underwriter: '삼성증권, 한국투자증권',
    subDate: '2026.02.10 ~ 02.11',
    listDate: '2026.02.20',
    status: '상장완료',
    price: '15,000원'
  },
  {
    id: 12,
    name: '컬리',
    industry: '이커머스',
    underwriter: 'NH투자증권, 한국투자증권, 제이피모간',
    subDate: '2025.09.10 ~ 09.11',
    listDate: '2025.09.21',
    status: '상장완료',
    price: '-'
  },
  {
    id: 13,
    name: '야놀자',
    industry: '플랫폼',
    underwriter: '미래에셋증권, 삼성증권',
    subDate: '2025.08.15 ~ 08.16',
    listDate: '2025.08.25',
    status: '상장완료',
    price: '-'
  },
])

function getStatusStyle(status) {
  const map = {
    '청약예정': 'bg-toss-blueLight text-toss-blue',
    '상장완료': 'bg-toss-gray text-toss-grayText',
    '심사중': 'bg-amber-50 text-amber-700',
    '준비중': 'bg-toss-gray text-toss-grayText',
  }
  return map[status] || 'bg-toss-gray text-toss-grayText'
}

function goDetail(id) {
  router.push({name: 'detail', params: {id}})
}

function goSearch() {
  console.log('검색 페이지로 이동')
}
</script>

<template>
  <div class="min-h-screen bg-toss-gray">
    <header class="bg-white sticky top-0 z-10 border-b border-gray-100">
      <div class="max-w-2xl mx-auto px-5 pt-5 pb-4">
        <div class="flex items-center gap-1.5 mb-4">
          <div class="w-6 h-6 bg-toss-blue rounded-md flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <span class="text-xl font-black tracking-tight text-toss-black font-sans">
            IPO <span class="text-toss-blue">CHECK</span>
          </span>
        </div>

        <div>
          <h1 class="text-2xl font-bold text-toss-black">상장 예정 기업</h1>
          <p class="text-sm text-toss-grayText mt-1">IPO 일정과 청약 정보를 한눈에 확인하세요</p>
        </div>
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-5 py-6 pb-10">

      <button
          @click="goSearch"
          class="w-full bg-white rounded-toss-lg shadow-sm border border-gray-100 p-4 mb-6 flex items-center gap-3 text-left transition-all hover:bg-gray-50 hover:shadow-md group"
      >
        <svg xmlns="http://www.w3.org/2000/svg"
             class="h-5 w-5 text-toss-grayText group-hover:text-toss-blue transition-colors" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <span class="text-toss-grayText text-sm font-medium">종목명 검색</span>
      </button>

      <ul class="space-y-3">
        <li
            v-for="ipo in ipoList"
            :key="ipo.id"
            class="bg-white rounded-toss-lg shadow-sm p-5 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
            @click="goDetail(ipo.id)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0 pr-2"> <div class="flex items-center gap-2 mb-1">
              <h2 class="font-bold text-toss-black text-lg truncate leading-tight">{{ ipo.name }}</h2>
              <span
                  v-if="ipo.status === '청약예정'"
                  class="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide shrink-0"
              >
                  NEW
                </span>
            </div>

              <p class="text-xs text-toss-grayText mb-2">{{ ipo.industry }}</p>

              <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-toss-blue bg-blue-50 px-1 rounded shrink-0 w-[30px] text-center">청약</span>
                  <span class="text-xs text-toss-black">{{ ipo.subDate }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-gray-500 bg-gray-100 px-1 rounded shrink-0 w-[30px] text-center">상장</span>
                  <span class="text-xs text-gray-600">{{ ipo.listDate }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] font-bold text-gray-500 bg-gray-100 px-1 rounded shrink-0 w-[30px] text-center">주관</span>
                  <span class="text-xs text-toss-grayText truncate">{{ ipo.underwriter }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-1 ml-2 mt-0.5 shrink-0">
              <span
                  class="px-2.5 py-1 rounded-md text-xs font-bold w-fit"
                  :class="getStatusStyle(ipo.status)"
              >
                {{ ipo.status }}
              </span>
              <div class="flex items-center gap-1 mt-1">
                <span v-if="ipo.price !== '-'" class="text-sm font-bold text-toss-black">
                  {{ ipo.price }}
                </span>
                <span class="text-gray-300 text-lg leading-none">›</span>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </main>
  </div>
</template>
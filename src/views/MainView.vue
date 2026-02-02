<script setup>
import {computed, onMounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import axios from "axios";

const router = useRouter()

// 상태 관리 변수들
const ipoList = ref([])           // 데이터 담을 곳
const isLoading = ref(false)       // 로딩 중인지 여부
const isError = ref(false)        // 에러 발생 여부

// 무한 스크롤용 변수
const page = ref(0)        // 현재 페이지 (0부터 시작한다고 가정)
const size = ref(10)       // 한 번에 가져올 개수
const isLastPage = ref(false) // 더 이상 데이터가 없는지 확인
const sentinel = ref(null) // 바닥 감지용 DOM 요소 (ref="sentinel")
let observer = null        // IntersectionObserver 인스턴스

// 검색어 상태
const searchQuery = ref('')

const API_BASE_URL = 'http://localhost:8080/api'

const fetchIpoList = async () => {
  // 1. 이미 로딩 중이거나, 마지막 페이지에 도달했다면 요청하지 않음 (방어 코드)
  if (isLoading.value || isLastPage.value) return

  try {
    isLoading.value = true
    isError.value = false

    // 2. 백엔드 요청 (GET /api/upcoming-ipo?page=0&size=10)
    const response = await axios.get(`${API_BASE_URL}/upcoming-ipo/list`)
    if (Array.isArray(response.data)) {
      ipoList.value = response.data
    }
  } catch (error) {
    console.error('데이터 로딩 실패:', error)
    isError.value = true
  } finally {
    // 7. 로딩 상태 해제
    isLoading.value = false
  }
}

onMounted(() => {
  fetchIpoList()
})

const filteredIpoList = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return ipoList.value
  }

  return ipoList.value.filter(item =>
      item.corpName?.toLowerCase().includes(query)
  )
})

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

</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white sticky top-0 z-10 border-b border-gray-100">
      <div class="max-w-2xl mx-auto px-5 pt-5 pb-4">
        <div class="flex items-center gap-1.5 mb-4">
          <div class="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <span class="text-xl font-black tracking-tight text-gray-900 font-sans">
            IPO <span class="text-blue-600">CHECK</span>
          </span>
        </div>

        <div>
          <h1 class="text-2xl font-bold text-gray-900">상장 예정 기업</h1>
          <p class="text-sm text-gray-500 mt-1">IPO 일정과 청약 정보를 한눈에 확인하세요</p>
        </div>
      </div>
    </header>

    <main class="max-w-2xl mx-auto px-5 py-6 pb-10">
      <div class="relative mb-6 group">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg"
               class="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input
            type="text"
            :value="searchQuery"
            @input="searchQuery = $event.target.value"
            placeholder="종목명 검색"
            class="w-full bg-white rounded-xl shadow-sm border border-gray-200 py-4 pl-12 pr-4 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
               stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div v-if="isLoading" class="flex justify-center py-20">
        <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none"
             viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <div v-else-if="filteredIpoList.length === 0" class="text-center py-10">
        <p class="text-gray-500">검색 결과가 없습니다.</p>
      </div>

      <ul v-else class="space-y-3">
        <li
            v-for="ipo in filteredIpoList"
            :key="ipo.upcomingIpoId"
            class="bg-white rounded-xl shadow-sm p-5 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer border border-transparent hover:border-blue-100"
            @click="goDetail(ipo.upcomingIpoId)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0 pr-2">
              <div class="flex items-center gap-2 mb-1">
                <h2 class="font-bold text-gray-900 text-lg truncate leading-tight">{{ ipo.corpName }}</h2>

                <span
                    v-if="ipo.market"
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 tracking-tight shrink-0"
                >
          {{ ipo.market }}
        </span>

                <span
                    v-if="ipo.status && ipo.status.includes('청약')"
                    class="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide shrink-0"
                >
          NEW
        </span>
              </div>

              <p class="text-xs text-gray-500 mb-3">{{ ipo.industry || '업종 미정' }}</p>

              <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0 w-[34px] text-center">청약</span>
                  <span class="text-xs text-gray-700 font-medium">{{ ipo.subDate }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 w-[34px] text-center">상장</span>
                  <span class="text-xs text-gray-500">{{ ipo.listDate }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 w-[34px] text-center">주관</span>
                  <span class="text-xs text-gray-500 truncate">{{ ipo.underwriter }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-1.5 ml-2 mt-0.5 shrink-0">
      <span
          class="px-2.5 py-1 rounded-md text-xs font-bold w-fit whitespace-nowrap"
          :class="getStatusStyle(ipo.status)"
      >
        {{ ipo.status }}
      </span>
              <div class="flex items-center gap-1 mt-1">
        <span v-if="ipo.price && ipo.price !== '-'" class="text-sm font-bold text-gray-900">
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
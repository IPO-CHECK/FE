<script setup>
import {computed, ref} from 'vue'
import {useRouter} from 'vue-router'

const router = useRouter()

// 상태 관리 변수들
// const ipoList = ref([])           // 데이터 담을 곳
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

// --- 데이터 가져오기 함수 ---
// const fetchIpoList = async () => {
//   // 1. 이미 로딩 중이거나, 마지막 페이지에 도달했다면 요청하지 않음 (방어 코드)
//   if (isLoading.value || isLastPage.value) return
//
//   try {
//     isLoading.value = true
//     isError.value = false
//
//     // 2. 백엔드 요청 (GET /api/list?page=0&size=10)
//     const response = await axios.get(`${API_BASE_URL}/list`, {
//       params: {
//         page: page.value,
//         size: size.value
//       }
//     })
//
//     // 3. 응답 데이터 분해 (백엔드가 Page 객체로 준다고 가정)
//     // content: 실제 데이터 배열
//     // last: 마지막 페이지 여부 (boolean)
//     const { content, last } = response.data
//
//     if (content && content.length > 0) {
//       // 4. 기존 리스트 뒤에 새 데이터 이어 붙이기
//       ipoList.value.push(...content)
//
//       // 5. 다음 요청을 위해 페이지 번호 1 증가
//       page.value++
//     }
//
//     // 6. 마지막 페이지인지 확인 (백엔드에서 알려준 last 값 사용)
//     if (last) {
//       isLastPage.value = true
//     }
//
//   } catch (error) {
//     console.error('데이터 로딩 실패:', error)
//     isError.value = true
//   } finally {
//     // 7. 로딩 상태 해제
//     isLoading.value = false
//   }
// }

// // --- 무한 스크롤 옵저버 설정 ---
// onMounted(() => {
//   // 1. 초기 데이터 로드
//   fetchIpoList()
//
//   // 2. 옵저버 생성
//   observer = new IntersectionObserver((entries) => {
//     // 바닥 감지 요소(sentinel)가 화면에 들어왔고(isIntersecting), 데이터가 더 있다면
//     if (entries[0].isIntersecting && !isLastPage.value) {
//       fetchIpoList()
//     }
//   }, {
//     root: null,      // 브라우저 뷰포트 기준
//     threshold: 0.1   // 10%만 보여도 콜백 실행
//   })
//
//   // 3. 감시 시작
//   if (sentinel.value) {
//     observer.observe(sentinel.value)
//   }
// })
//
// // 컴포넌트가 사라질 때 옵저버 해제 (메모리 누수 방지)
// onUnmounted(() => {
//   if (observer && sentinel.value) {
//     observer.unobserve(sentinel.value)
//   }
// })

const ipoList = ref([
  {
    id: 1,
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

const filteredIpoList = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    return ipoList.value
  }

  return ipoList.value.filter(item =>
      item.name.toLowerCase().includes(query)
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

      <div class="relative mb-6 group">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg"
               class="h-5 w-5 text-toss-grayText group-focus-within:text-toss-blue transition-colors" fill="none"
               viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input
            type="text"
            :value="searchQuery"
            @input="searchQuery = $event.target.value"
            placeholder="종목명 검색"
            class="w-full bg-white rounded-toss-lg shadow-sm border border-gray-100 py-4 pl-12 pr-4 text-sm font-medium text-toss-black placeholder-toss-grayText focus:outline-none focus:ring-2 focus:ring-toss-blue/20 focus:border-toss-blue transition-all"
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

      <div v-if="filteredIpoList.length === 0 && !isLoading" class="text-center py-10">
        <p class="text-toss-grayText">검색 결과가 없습니다.</p>
      </div>

      <ul class="space-y-3">
        <li
            v-for="ipo in filteredIpoList"
            :key="ipo.id"
            class="bg-white rounded-toss-lg shadow-sm p-5 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
            @click="goDetail(ipo.id)"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0 pr-2">
              <div class="flex items-center gap-2 mb-1">
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
                  <span
                      class="text-[10px] font-bold text-toss-blue bg-blue-50 px-1 rounded shrink-0 w-[30px] text-center">청약</span>
                  <span class="text-xs text-toss-black">{{ ipo.subDate }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span
                      class="text-[10px] font-bold text-gray-500 bg-gray-100 px-1 rounded shrink-0 w-[30px] text-center">상장</span>
                  <span class="text-xs text-gray-600">{{ ipo.listDate }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span
                      class="text-[10px] font-bold text-gray-500 bg-gray-100 px-1 rounded shrink-0 w-[30px] text-center">주관</span>
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

      <div ref="sentinel" class="h-4 w-full flex justify-center items-center mt-4 pb-10">

        <div v-if="isLoading" class="flex items-center gap-2">
          <svg class="animate-spin h-5 w-5 text-toss-blue" xmlns="http://www.w3.org/2000/svg" fill="none"
               viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm text-toss-grayText">불러오는 중...</span>
        </div>
        <div v-else-if="isLastPage && ipoList.length > 0" class="text-sm text-toss-grayText">
          마지막 목록입니다.
        </div>
      </div>
    </main>
  </div>
</template>
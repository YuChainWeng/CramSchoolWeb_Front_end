<template>
  <div class="results-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Result</p>
        <h1 class="ds-page-title page-title">每張的對比情形</h1>
        <p class="ds-page-desc">顯示 YOLO 標籤配對正確答案的數量，並快速回顧 OCR 辨識結果。</p>
      </div>
      <div class="header-actions">
        <button class="ds-btn" :disabled="scoredImages.length === 0" @click="exportCSV">
          <Download :size="14" /> 匯出 CSV
        </button>
        <button class="ds-btn" @click="goToUpload">重新上傳</button>
        <button class="ds-btn ds-btn--primary" @click="goToLabel">返回標記</button>
      </div>
    </div>

    <!-- OCR 處理中的 loading 狀態 -->
    <div v-if="isProcessingOCR" class="ds-card loading-state">
      <span class="ds-spinner spinner-lg"></span>
      <p>正在辨識學生答案…</p>
      <p class="loading-progress">{{ ocrProgress.current }} / {{ ocrProgress.total }}</p>
    </div>

    <div v-else-if="scoredImages.length === 0" class="empty-state">
      <p>目前沒有批改結果，請先完成標記與批改。</p>
      <div class="empty-actions">
        <button class="ds-btn ds-btn--primary" @click="goToUpload">上傳照片</button>
        <button class="ds-btn" @click="goToLabel">回到標記頁</button>
      </div>
    </div>

    <div v-else class="results-body">
      <div v-if="showMasterWarning" class="ds-banner ds-banner--warning">
        <AlertTriangle :size="16" />
        <div class="ds-banner__body">
          <strong>提醒：</strong>尚未取得標準答案卷的 OCR 結果，請回到標記頁同步標準卷的框位與 OCR，再重新查看結果。
        </div>
      </div>

      <div v-if="ocrFailedCount > 0" class="ds-banner ds-banner--danger">
        <AlertTriangle :size="16" />
        <div class="ds-banner__body">
          <strong>{{ ocrFailedCount }} 張考卷答案辨識失敗。</strong>請確認 OCR 服務連線後重試。
        </div>
        <button class="ds-btn ds-btn--sm banner-retry" @click="processStudentOCR">重新辨識</button>
      </div>

      <div class="stats-row">
        <div class="ds-card stat-card">
          <p class="ds-eyebrow stat-label">考卷數</p>
          <p class="stat-value">{{ summary.total }}</p>
        </div>
        <div class="ds-card stat-card">
          <p class="ds-eyebrow stat-label">已批改</p>
          <p class="stat-value">{{ summary.gradedCount }}<span class="stat-sub"> / {{ summary.total }}</span></p>
        </div>
        <div class="ds-card stat-card">
          <p class="ds-eyebrow stat-label">答對題數</p>
          <p class="stat-value">
            <template v-if="summary.gradedCount > 0">
              {{ summary.totalCorrect }}<span class="stat-sub"> / {{ summary.totalQuestions }} 題</span>
            </template>
            <template v-else>—</template>
          </p>
        </div>
      </div>

      <div class="image-grid">
        <article
          v-for="(img, idx) in scoredImages"
          :key="img.name"
          class="ds-card ds-card--hoverable image-card"
          role="button"
          tabindex="0"
          @click="openModal(idx)"
          @keydown.enter.prevent="openModal(idx)"
          @keydown.space.prevent="openModal(idx)"
        >
          <div class="thumb">
            <img :src="img.preview || placeholderImage" :alt="img.name" />
            <div class="box-layer" v-if="img.labels.length">
              <div
                v-for="(label, bIdx) in img.labels"
                :key="bIdx"
                class="bbox"
                :class="label.isCorrect === true ? 'bbox--correct' : label.isCorrect === false ? 'bbox--wrong' : 'bbox--pending'"
                :style="boxStyle(label)"
              ></div>
            </div>
            <span class="score-chip">{{ img.correctCount }}/{{ img.totalLabels }}</span>
            <span class="status-badge ds-badge" :class="img.graded ? 'ds-badge--correct' : 'ds-badge--pending'">
              {{ img.graded ? '已批改' : '待批改' }}
            </span>
          </div>
          <div class="card-body">
            <div class="card-title">
              <h3>{{ img.name }}</h3>
              <span class="accuracy" :class="{ 'accuracy--pending': !img.graded }">
                {{ img.graded ? `答對 ${img.correctCount} / ${img.totalLabels} 題` : '尚未批改' }}
              </span>
            </div>
            <div class="card-meta">
              <span>正確 <strong class="meta-correct">{{ img.correctCount }}</strong></span>
              <span>錯誤 <strong class="meta-wrong">{{ img.incorrectCount }}</strong></span>
              <span>標籤總數 <strong class="meta-total">{{ img.totalLabels }}</strong></span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>

  <div v-if="selectedImage" class="ds-modal-overlay" @click="closeModal">
    <div class="ds-modal detail-modal" @click.stop>
      <div class="ds-modal__header">
        <h3>{{ selectedImage.name }}</h3>
        <button class="ds-btn ds-btn--ghost ds-btn--sm ds-btn--icon" @click="closeModal" title="關閉">
          <X :size="14" />
        </button>
      </div>
      <div class="ds-modal__body">
        <div class="detail-grid">
          <div class="modal-image-wrap">
            <div class="modal-image-inner">
              <img :src="selectedImage.preview || placeholderImage" :alt="selectedImage.name" />
              <div class="box-layer" v-if="selectedImage.labels.length">
                <div
                  v-for="(label, idx) in selectedImage.labels"
                  :key="idx"
                  class="bbox"
                  :class="label.isCorrect === true ? 'bbox--correct' : label.isCorrect === false ? 'bbox--wrong' : 'bbox--pending'"
                  :style="boxStyle(label)"
                >
                  <span class="bbox-tag">#{{ idx + 1 }} {{ label.recognizedAnswer || '—' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedImage.labels.length" class="answer-rows">
            <div
              v-for="(label, idx) in selectedImage.labels"
              :key="idx"
              class="answer-row"
            >
              <span class="answer-index">#{{ idx + 1 }}</span>
              <span class="answer-text">OCR <strong>{{ label.recognizedAnswer || '—' }}</strong></span>
              <span class="answer-text">正解 <strong>{{ label.expectedAnswer || label.answer || '—' }}</strong></span>
              <span
                class="ds-badge answer-chip"
                :class="label.isCorrect === true ? 'ds-badge--correct' : label.isCorrect === false ? 'ds-badge--wrong' : 'ds-badge--pending'"
              >
                <Check v-if="label.isCorrect === true" :size="11" />
                <X v-else-if="label.isCorrect === false" :size="11" />
                <Clock v-else :size="11" />
                {{ label.isCorrect === undefined ? '未判定' : label.isCorrect ? '正確' : '錯誤' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, X, Check, Clock, Download } from 'lucide-vue-next'
import { CANVAS_WIDTH as BASE_CANVAS_WIDTH, CANVAS_HEIGHT as BASE_CANVAS_HEIGHT } from '../constants'
import { getResultsData, updateStudentImages, updateMasterImage } from '../stores/resultsStore'

// OCR 處理狀態
const isProcessingOCR = ref(false)
const ocrProgress = ref({ current: 0, total: 0 })
const ocrFailedCount = ref(0)

interface LabelResult {
  recognizedAnswer?: string
  expectedAnswer?: string
  answer?: string
  isCorrect?: boolean
  x?: number
  y?: number
  width?: number
  height?: number
  ocrCandidates?: {
    chinese: string
    digit: string
  }
}

interface IncomingImage {
  name: string
  preview?: string
  labels?: LabelResult[]
  correctCount?: number
  totalLabels?: number
}

interface ResultsPayload {
  masterKey?: IncomingImage | null
  students?: IncomingImage[]
}

interface NormalizedImage extends IncomingImage {
  preview: string
  labels: LabelResult[]
  correctCount: number
  totalLabels: number
  incorrectCount: number
  accuracy: number
  graded: boolean
}

const router = useRouter()
const scoredImages = ref<NormalizedImage[]>([])
const masterKeyImage = ref<IncomingImage | null>(null)
const selectedIndex = ref<number | null>(null)
const placeholderImage =
  'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"200\" viewBox=\"0 0 320 200\" fill=\"none\"><rect width=\"320\" height=\"200\" rx=\"12\" fill=\"%23F0F4FD\"/><text x=\"50%\" y=\"50%\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-family=\"Arial\" font-size=\"16\" fill=\"%236E7683\">預覽圖片</text></svg>'

const extractTextValue = (value: any, seen = new Set<any>()): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? extractTextValue(value[0], seen) : ''
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return ''
    seen.add(value)
    const candidate =
      value.text ??
      value.words ??
      value.word ??
      value.label ??
      value.content ??
      value.result ??
      value.prediction ??
      value.ocr ??
      value.value ??
      value.answer ??
      value.recognizedAnswer ??
      value.data?.text ??
      value.data?.words ??
      value.data?.word ??
      value.data?.label ??
      value.data?.result ??
      value.data?.prediction ??
      value.data?.ocr
    if (candidate !== undefined && candidate !== null) {
      return candidate === value ? '' : extractTextValue(candidate, seen)
    }
    for (const key of Object.keys(value)) {
      const found = extractTextValue((value as Record<string, any>)[key], seen)
      if (found) return found
    }
  }
  return ''
}

const normalizeAnswer = (value?: any) => extractTextValue(value).trim()

// 比對用的正規化（只影響對錯判定，不影響畫面上顯示的原始文字）。
// 答案卷上的選擇題正解常寫成「(3)」「（3）」「③」，學生圈選後辨識出來的卻是「3」，
// 不統一格式會讓明明認對的題目被判成錯誤。
const CIRCLED_DIGITS = '①②③④⑤⑥⑦⑧⑨⑩'

const compareKey = (value?: any): string => {
  let text = normalizeAnswer(value)
  if (!text) return ''
  // 全形英數 → 半形
  text = text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  )
  // 圈碼數字 → 阿拉伯數字
  text = text.replace(/[①-⑩]/g, (c) => String(CIRCLED_DIGITS.indexOf(c) + 1))
  // 去掉包覆用的括號與引號
  text = text.replace(/[()（）[\]［］「」『』【】〔〕{}｛｝]/g, '')
  // 去掉所有空白（含全形空白）
  return text.replace(/[\s　]/g, '')
}

const extractOcrResultsArray = (payload: any) => {
  const results =
    payload?.ocr_results ??
    payload?.ocrResults ??
    payload?.results ??
    payload?.data?.ocr_results ??
    payload?.body?.json?.ocr_results

  if (!Array.isArray(results)) return null
  return results.map((value) => normalizeAnswer(value))
}

const mergeOcrResultsWithImages = (
  images: IncomingImage[],
  ocrPayload: any,
  imageName?: string
) => {
  const ocrResults = extractOcrResultsArray(ocrPayload)
  if (!ocrResults) return images

  let targetIndex = imageName
    ? images.findIndex((img) => img.name === imageName)
    : images.length === 1
      ? 0
      : -1

  if (targetIndex === -1 && images.length > 0) {
    targetIndex = 0
  }

  return images.map((img, index) => {
    if (index !== targetIndex) return img
    const labels = (img.labels ?? []).map((label, labelIndex) => ({
      ...label,
      recognizedAnswer: normalizeAnswer(ocrResults[labelIndex] ?? label.recognizedAnswer)
    }))
    return { ...img, labels }
  })
}

const normalizeImage = (
  img: IncomingImage,
  expectedAnswers: string[] = []
): NormalizedImage => {
  const labels = (img.labels ?? []).map((label, index) => {
    const normalizedAnswer = normalizeAnswer(label.answer)
    const expectedFromMaster = expectedAnswers[index] || ''
    const expectedAnswer =
      expectedFromMaster || normalizeAnswer(label.expectedAnswer) || normalizedAnswer

    // 智能選擇 OCR 結果：根據正解是數字還是中文
    let normalizedRecognized = normalizeAnswer(label.recognizedAnswer)
    if (label.ocrCandidates) {
      if (expectedAnswer) {
        // 有正解時，根據正解類型選擇；先正規化才不會被「(3)」的括號干擾判斷
        const isExpectedDigit = /^\d+$/.test(compareKey(expectedAnswer))
        normalizedRecognized = isExpectedDigit
          ? (label.ocrCandidates.digit || '').trim()
          : (label.ocrCandidates.chinese || '').trim()
      } else {
        // 沒有正解時，預設顯示中文結果（若為空則顯示數字）
        normalizedRecognized = (label.ocrCandidates.chinese || label.ocrCandidates.digit || '').trim()
      }
    }

    let isCorrect = label.isCorrect
    if (typeof isCorrect !== 'boolean' && expectedAnswer && normalizedRecognized) {
      isCorrect = compareKey(normalizedRecognized) === compareKey(expectedAnswer)
    }
    return {
      ...label,
      recognizedAnswer: normalizedRecognized,
      answer: normalizedAnswer,
      expectedAnswer,
      isCorrect
    }
  })
  const gradedLabels = labels.filter(label => typeof label.isCorrect === 'boolean')
  const totalLabels = labels.length > 0
    ? labels.length
    : typeof img.totalLabels === 'number' ? img.totalLabels : 0
  // 是否已批改：以逐題判定結果為準（避免重複 normalize 時把數字欄位誤判成已批改）
  const graded = gradedLabels.length > 0
  const derivedCorrect = gradedLabels.filter(label => label.isCorrect).length
  const boundedCorrect = Math.min(Math.max(derivedCorrect, 0), totalLabels || Number.MAX_SAFE_INTEGER)
  const accuracy = totalLabels > 0 ? Math.round((boundedCorrect / totalLabels) * 100) : 0
  const incorrectCount = graded ? Math.max(totalLabels - boundedCorrect, 0) : 0

  return {
    ...img,
    preview: img.preview || '',
    labels,
    correctCount: boundedCorrect,
    totalLabels,
    incorrectCount,
    accuracy,
    graded
  }
}

const STORAGE_KEY = 'results-page-data'

// 圖片 base64 可能超過 sessionStorage 配額；寫入失敗只影響重新整理後的快取
const persistResults = (payload: ResultsPayload) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (err) {
    console.warn('Unable to cache results in sessionStorage', err)
  }
}

const extractPayload = (payload: any): ResultsPayload => {
  if (Array.isArray(payload)) {
    return { students: payload }
  }
  if (payload && (payload.students || payload.masterKey)) {
    return {
      students: payload.students ?? [],
      masterKey: payload.masterKey ?? null
    }
  }
  return { students: [] }
}

const getExpectedAnswers = (master: IncomingImage | null): string[] =>
  (master?.labels ?? []).map((label) =>
    normalizeAnswer(label.expectedAnswer ?? label.answer)
  )

const loadResultsFromState = () => {
  const cachedInMemory = getResultsData()
  if (cachedInMemory) {
    const { masterKey, students } = extractPayload(cachedInMemory)
    if ((students && students.length > 0) || masterKey) {
      masterKeyImage.value = masterKey ?? null
      const expectedAnswers = getExpectedAnswers(masterKeyImage.value)
      scoredImages.value = (students ?? []).map((img) =>
        normalizeImage(img, [...expectedAnswers])
      )
      return
    }
  }
  const state = history.state as {
    results?: IncomingImage[] | ResultsPayload
    images?: IncomingImage[] | ResultsPayload
    allImages?: IncomingImage[] | ResultsPayload
    ocrResults?: any
    imageName?: string
    state?: {
      results?: IncomingImage[] | ResultsPayload
      images?: IncomingImage[] | ResultsPayload
      allImages?: IncomingImage[] | ResultsPayload
      ocrResults?: any
      imageName?: string
    }
  }

  const nestedState = state?.state
  const ocrPayload = state?.ocrResults || nestedState?.ocrResults
  const ocrImages =
    state?.allImages || state?.images || nestedState?.allImages || nestedState?.images
  const ocrImageName = state?.imageName || nestedState?.imageName

  if (ocrPayload && ocrImages) {
    const { students, masterKey } = extractPayload(ocrImages)
    if (students && students.length > 0) {
      const merged = mergeOcrResultsWithImages(students, ocrPayload, ocrImageName)
      masterKeyImage.value = masterKey ?? null
      const expectedAnswers = getExpectedAnswers(masterKeyImage.value)
      scoredImages.value = merged.map((img) => normalizeImage(img, [...expectedAnswers]))
      persistResults({ students: merged, masterKey: masterKeyImage.value })
      return
    }
  }

  const payload = state?.results || state?.images || nestedState?.results || nestedState?.images

  if (payload) {
    const { masterKey, students } = extractPayload(payload)
    if ((students && students.length > 0) || masterKey) {
      masterKeyImage.value = masterKey ?? null
      const expectedAnswers = getExpectedAnswers(masterKeyImage.value)
      scoredImages.value = (students ?? []).map((img) =>
        normalizeImage(img, [...expectedAnswers])
      )
      persistResults({ students: students ?? [], masterKey: masterKeyImage.value })
      return
    }
  }

  const cached = sessionStorage.getItem(STORAGE_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as ResultsPayload | IncomingImage[]
      const { masterKey, students } = extractPayload(parsed)
      masterKeyImage.value = masterKey ?? null
      const expectedAnswers = getExpectedAnswers(masterKeyImage.value)
      scoredImages.value = (students ?? []).map((img) =>
        normalizeImage(img, [...expectedAnswers])
      )
      return
    } catch (err) {
      console.warn('Unable to parse cached results', err)
    }
  }

  scoredImages.value = []
}

// 計算圖片縮放參數（與 LabelView 相同邏輯）
const computeFit = (imgWidth: number, imgHeight: number) => {
  const scaleX = BASE_CANVAS_WIDTH / imgWidth
  const scaleY = BASE_CANVAS_HEIGHT / imgHeight
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (BASE_CANVAS_WIDTH - imgWidth * scale) / 2
  const offsetY = (BASE_CANVAS_HEIGHT - imgHeight * scale) / 2
  return { scale, offsetX, offsetY }
}

// 載入圖片取得尺寸
const loadPreviewImage = (preview: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = preview
  })
}

// 對單一學生卷執行 OCR；ok 代表這張是否成功取得結果
const runStudentOCR = async (
  img: IncomingImage
): Promise<{ image: IncomingImage; ok: boolean }> => {
  if (!img.preview || !img.labels || img.labels.length === 0) return { image: img, ok: true }

  try {
    // 準備 base64 資料
    const base64Data = img.preview.replace(/^data:image\/\w+;base64,/, '')

    // 載入圖片取得原始尺寸，計算縮放參數
    const previewImg = await loadPreviewImage(img.preview)
    const { scale, offsetX, offsetY } = computeFit(previewImg.width, previewImg.height)

    // 計算 bbox（轉換回原圖座標）
    const inputPayload = {
      image: base64Data,
      annotations: img.labels.map(l => {
        const x = l.x ?? 0
        const y = l.y ?? 0
        const w = l.width ?? 0
        const h = l.height ?? 0
        return {
          class: '答案區',
          bbox: [
            (x - offsetX) / scale,
            (y - offsetY) / scale,
            ((x - offsetX) / scale) + (w / scale),
            ((y - offsetY) / scale) + (h / scale)
          ]
        }
      })
    }

    // 呼叫後端（30 秒逾時）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch('/api/ocr_process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputPayload),
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (!response.ok) throw new Error('OCR API Error')
    const resultData = await response.json()
    const results = resultData.ocr_results || resultData.results || []

    // 將 OCR 結果填入 labels
    if (Array.isArray(results)) {
      const updatedLabels = img.labels.map((label, index) => {
        const res = results[index]
        if (!res) return label

        const candidate = (res.chinese !== undefined || res.digit !== undefined)
          ? { chinese: String(res.chinese || ''), digit: String(res.digit || '') }
          : undefined

        return {
          ...label,
          ocrCandidates: candidate,
          recognizedAnswer: candidate ? undefined : extractTextValue(res)
        }
      })
      return { image: { ...img, labels: updatedLabels }, ok: true }
    }
    return { image: img, ok: false }
  } catch (error) {
    console.warn(`圖片 ${img.name} OCR 失敗:`, error)
    return { image: img, ok: false }
  }
}

// 對所有學生卷執行 OCR（並行處理，最多 5 張同時）
const processStudentOCR = async () => {
  if (scoredImages.value.length === 0 || isProcessingOCR.value) return

  isProcessingOCR.value = true
  ocrFailedCount.value = 0
  const expectedAnswers = getExpectedAnswers(masterKeyImage.value)

  // 篩選需要 OCR 的圖片（還沒有結果的）
  const toProcess: { index: number; img: NormalizedImage }[] = []
  scoredImages.value.forEach((img, index) => {
    if (!img) return
    const hasOcrResult = img.labels.some(l => l.recognizedAnswer || l.ocrCandidates)
    if (!hasOcrResult) {
      toProcess.push({ index, img })
    }
  })

  ocrProgress.value = { current: 0, total: toProcess.length }

  // 並行處理，每批最多 5 張，每張完成就更新進度
  const BATCH_SIZE = 5
  let completed = 0
  let failed = 0

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE)

    // 同時處理這批圖片，每張完成就立即更新
    await Promise.all(
      batch.map(async ({ index, img }) => {
        const { image, ok } = await runStudentOCR(img)
        scoredImages.value[index] = normalizeImage(image, [...expectedAnswers])
        if (!ok) failed++
        completed++
        ocrProgress.value.current = completed
      })
    )
  }

  ocrFailedCount.value = failed
  isProcessingOCR.value = false
}

// Esc 關閉詳細檢視 modal
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && selectedIndex.value !== null) {
    closeModal()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  loadResultsFromState()
  // 載入資料後自動執行學生卷 OCR
  await processStudentOCR()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// 總覽統計
// 以「答對題數」而非百分比呈現：考卷各題配分不同（每字 1 分、每格 2 分…），
// 均分計算出來的百分比與老師實際給分對不起來，容易誤導。
const summary = computed(() => {
  const total = scoredImages.value.length
  const graded = scoredImages.value.filter((img) => img.graded)
  const totalCorrect = graded.reduce((sum, img) => sum + img.correctCount, 0)
  const totalQuestions = graded.reduce((sum, img) => sum + img.totalLabels, 0)
  return { total, gradedCount: graded.length, totalCorrect, totalQuestions }
})

// 匯出成績 CSV（含 BOM 讓 Excel 正確辨識 UTF-8）
const exportCSV = () => {
  if (scoredImages.value.length === 0) return

  const header = ['考卷', '狀態', '答對題數', '答錯題數', '總題數']
  const rows = scoredImages.value.map((img) => [
    img.name,
    img.graded ? '已批改' : '待批改',
    String(img.correctCount),
    String(img.incorrectCount),
    String(img.totalLabels)
  ])
  const escapeCell = (cell: string) => `"${cell.replace(/"/g, '""')}"`
  const csv = '\ufeff' + [header, ...rows]
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `批改結果_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const goToLabel = () => {
  // 確保傳回的資料包含所有必要屬性，避免 LabelView 重新偵測
  const filesForLabel = scoredImages.value.map(img => ({
    ...img,
    preview: img.preview || '',
    role: 'student' as const,
    predictionsLoaded: true,  // 已經有 labels，不需重新偵測
    isPredicting: false,
    predictionError: undefined
  }))

  const masterForLabel = masterKeyImage.value
    ? {
        ...masterKeyImage.value,
        preview: masterKeyImage.value.preview || '',
        role: 'master' as const,
        predictionsLoaded: true,
        isPredicting: false,
        predictionError: undefined
      }
    : null

  // 同步更新 store（統一的資料來源）
  updateStudentImages(filesForLabel as any)
  updateMasterImage(masterForLabel as any)

  router.push({ name: 'label' })
}

const goToUpload = () => {
  router.push({ name: 'upload' })
}

const boxStyle = (label: LabelResult) => {
  const x = label.x ?? 0
  const y = label.y ?? 0
  const w = label.width ?? 0
  const h = label.height ?? 0
  const left = (x / BASE_CANVAS_WIDTH) * 100
  const top = (y / BASE_CANVAS_HEIGHT) * 100
  const width = (w / BASE_CANVAS_WIDTH) * 100
  const height = (h / BASE_CANVAS_HEIGHT) * 100

  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`
  }
}

const openModal = (idx: number) => {
  selectedIndex.value = idx
}

const closeModal = () => {
  selectedIndex.value = null
}

const selectedImage = computed(() =>
  selectedIndex.value !== null ? scoredImages.value[selectedIndex.value] : null
)

const showMasterWarning = computed(() => {
  if (!masterKeyImage.value) return true
  const expectedAnswers = getExpectedAnswers(masterKeyImage.value)
  return expectedAnswers.length === 0 || expectedAnswers.every((value) => !value)
})
</script>

<style scoped>
.results-page {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-8) var(--page-pad);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0;
  color: var(--accent);
  font-weight: var(--weight-bold);
  letter-spacing: var(--tracking-wide);
  font-size: var(--text-xs);
  text-transform: uppercase;
}

.page-title {
  margin: 4px 0;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Loading 狀態 */
.loading-state {
  padding: 48px 32px;
  text-align: center;
  color: var(--text-2);
}

.loading-state .spinner-lg {
  width: 40px;
  height: 40px;
  border-width: 4px;
  margin-bottom: 12px;
}

.loading-state p {
  margin: 0 0 4px;
}

.loading-progress {
  font-family: var(--font-mono);
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--text-1);
}

/* 空狀態 */
.empty-state {
  background: var(--surface-card);
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 48px 32px;
  text-align: center;
  color: var(--text-2);
}

.empty-state p {
  margin: 0;
}

.empty-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.results-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.banner-retry {
  flex-shrink: 0;
  align-self: center;
}

/* 總覽統計 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 700px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  padding: 16px 20px;
}

.stat-label {
  margin: 0 0 4px;
}

.stat-value {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--text-1);
  line-height: var(--leading-tight);
}

.stat-sub {
  font-size: var(--text-md);
  font-weight: var(--weight-regular);
  color: var(--text-3);
}

/* 卡片網格 */
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .image-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .image-grid {
    grid-template-columns: 1fr;
  }
}

.image-card {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.thumb {
  position: relative;
  background: var(--surface-sunken);
  aspect-ratio: 4 / 3;
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.box-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bbox {
  position: absolute;
  border: 2px solid var(--accent);
  border-radius: 2px;
  box-sizing: border-box;
}

.bbox--correct { border-color: var(--status-correct); }
.bbox--wrong   { border-color: var(--status-wrong); }
.bbox--pending { border-color: var(--status-pending); }

.score-chip {
  position: absolute;
  top: 10px;
  left: 12px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  background: var(--gray-900);
  color: #fff;
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  pointer-events: none;
}

.status-badge {
  position: absolute;
  top: 10px;
  right: 12px;
  pointer-events: none;
}

.card-body {
  padding: 12px 16px 14px;
  border-top: 1px solid var(--border-default);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.card-title h3 {
  margin: 0;
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.accuracy {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-1);
}

.accuracy--pending {
  color: var(--text-3);
}

.card-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: var(--text-xs);
  color: var(--text-3);
}

.meta-correct { color: var(--status-correct); }
.meta-wrong   { color: var(--status-wrong); }
.meta-total   { color: var(--text-1); }

/* 詳細檢視 Modal */
.detail-modal {
  width: 880px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 5fr 4fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 800px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.modal-image-wrap {
  background: var(--surface-sunken);
  border-radius: var(--radius-md);
  padding: 20px;
}

.modal-image-inner {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #fff;
  border: 1px solid var(--border-default);
}

.modal-image-inner img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.bbox-tag {
  position: absolute;
  top: -1px;
  left: -1px;
  transform: translateY(-100%);
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  line-height: 1;
  padding: 3px 5px;
  border-radius: 3px 3px 3px 0;
  font-family: var(--font-mono);
  white-space: nowrap;
}

.bbox--correct .bbox-tag { background: var(--status-correct); }
.bbox--wrong .bbox-tag   { background: var(--status-wrong); }
.bbox--pending .bbox-tag { background: var(--status-pending); }

/* 逐題對照列表 */
.answer-rows {
  display: flex;
  flex-direction: column;
}

.answer-row {
  display: grid;
  grid-template-columns: 32px 1fr 1fr 72px;
  gap: 8px;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid var(--gray-100);
  font-size: var(--text-sm);
}

.answer-row:last-child {
  border-bottom: none;
}

.answer-index {
  font-family: var(--font-mono);
  color: var(--text-3);
}

.answer-text {
  color: var(--text-2);
}

.answer-text strong {
  color: var(--text-1);
  font-weight: var(--weight-medium);
  font-family: var(--font-mono);
}

.answer-chip {
  justify-self: end;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

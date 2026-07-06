<template>
  <div class="upload-container">
    <h1 class="ds-page-title">上傳圖片</h1>
    <p class="ds-page-desc page-desc">先上傳標準答案卷與學生考卷，再進入標註。</p>

    <div class="upload-area">

      <!-- 標準答案卷 -->
      <section class="upload-section">
        <h2 class="ds-section-title section-title">標準答案卷</h2>

        <!-- 未選擇時：上傳 or 選模板 並排 -->
        <div v-if="!masterFile" class="master-input-area">
          <div
            class="ds-dropzone"
            @dragover.prevent="handleDragOver('master')"
            @dragleave.prevent="handleDragLeave('master')"
            @drop.prevent="handleDrop('master', $event)"
            @click="triggerFileInput('master')"
            :class="{ 'is-dragover': isDraggingMaster }"
          >
            <span class="ds-dropzone__icon"><Upload :size="18" /></span>
            <p>拖曳或點擊上傳 1 張標準答案卷</p>
            <input
              type="file"
              ref="masterInput"
              @change="handleFileSelect('master', $event)"
              accept="image/*"
              style="display: none"
            />
            <button @click.stop="triggerFileInput('master')" class="ds-btn ds-btn--sm">選擇標準答案卷</button>
          </div>

          <div class="or-divider">或</div>

          <div class="ds-dropzone ds-dropzone--accent" @click="openTemplateModal">
            <span class="ds-dropzone__icon"><ClipboardList :size="18" /></span>
            <p>使用已儲存的答案卷</p>
            <button class="ds-btn ds-btn--sm" @click.stop="openTemplateModal">選擇已儲存答案卷</button>
          </div>
        </div>

        <!-- 已選擇後：上資訊下圖 -->
        <div v-if="masterFile" class="ds-card master-preview">
          <div class="master-preview-info">
            <div class="filename-row">
              <FileText :size="15" class="file-ic" />
              <span class="file-name">{{ masterFile.name }}</span>
              <span v-if="isFromTemplate" class="ds-badge ds-badge--accent">來自已儲存模板</span>
              <button @click="clearMaster" class="ds-btn ds-btn--danger ds-btn--sm">移除</button>
            </div>
            <input
              v-if="!isFromTemplate"
              type="text"
              v-model="masterExamName"
              placeholder="請輸入考卷名稱"
              class="ds-input"
            />
          </div>
          <div class="master-preview-figure">
            <img :src="masterFile.preview" :alt="masterFile.name" class="master-preview-image" />
          </div>
        </div>
      </section>

      <!-- 學生考卷 -->
      <section class="upload-section">
        <h2 class="ds-section-title section-title">學生考卷</h2>
        <div
          class="ds-dropzone"
          @dragover.prevent="handleDragOver('students')"
          @dragleave.prevent="handleDragLeave('students')"
          @drop.prevent="handleDrop('students', $event)"
          @click="triggerFileInput('students')"
          :class="{ 'is-dragover': isDraggingStudents }"
        >
          <span class="ds-dropzone__icon"><Files :size="18" /></span>
          <p>拖曳或點擊上傳多張學生考卷</p>
          <input
            type="file"
            ref="studentInput"
            @change="handleFileSelect('students', $event)"
            multiple
            accept="image/*"
            style="display: none"
          />
          <button @click.stop="triggerFileInput('students')" class="ds-btn ds-btn--sm">選擇學生考卷</button>
        </div>
        <div v-if="studentFiles.length > 0" class="file-list">
          <h3>已選擇圖片 ({{ studentFiles.length }})</h3>
          <div class="file-name-list">
            <div v-for="(file, index) in studentFiles" :key="index" class="file-name-item">
              <FileText :size="14" class="file-ic file-ic--faint" />
              <span class="file-name-text">{{ file.name }}</span>
              <button @click="removeStudent(index)" class="ds-btn ds-btn--ghost ds-btn--sm">移除</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="masterFile || studentFiles.length > 0" class="action-buttons">
      <button @click="clearAll" class="ds-btn ds-btn--ghost">清除全部</button>
      <button @click="uploadFiles" class="ds-btn ds-btn--primary">
        <Upload :size="16" />
        上傳並標註
      </button>
    </div>

    <!-- 選擇模板 Modal -->
    <div v-if="showTemplateModal" class="ds-modal-overlay" @click.self="closeTemplateModal">
      <div class="ds-modal">
        <div class="ds-modal__header">
          <h3>選擇已儲存的答案卷模板</h3>
          <button class="ds-btn ds-btn--ghost ds-btn--sm ds-btn--icon" @click="closeTemplateModal" title="關閉">
            <X :size="14" />
          </button>
        </div>

        <!-- 搜尋欄 -->
        <div class="modal-search">
          <div class="ds-input-group">
            <Search :size="14" />
            <input
              type="text"
              v-model="searchQuery"
              @input="onSearchInput"
              placeholder="搜尋模板名稱…"
              class="ds-input ds-input--sm"
            />
          </div>
        </div>

        <div class="ds-modal__body">
          <div v-if="isLoadingTemplates" class="modal-status">
            <span class="ds-spinner"></span>
            <span>載入中…</span>
          </div>
          <div v-else-if="templatesError" class="modal-status modal-status--error">
            <AlertCircle :size="16" />
            <span>無法連線到模板伺服器</span>
            <button class="ds-btn ds-btn--sm" @click="loadTemplates(searchQuery)">重試</button>
          </div>
          <div v-else-if="templates.length === 0" class="modal-status">
            {{ searchQuery ? '找不到符合的模板' : '尚無儲存的模板' }}
          </div>
          <div v-else class="template-list">
            <div v-for="t in templates" :key="t.id" class="template-item">
              <div class="template-info">
                <!-- 名稱列（一般模式） -->
                <div v-if="editingId !== t.id" class="template-name-row">
                  <span class="template-name">{{ t.exam_name }}</span>
                  <button class="ds-btn ds-btn--ghost ds-btn--sm ds-btn--icon" @click="startEdit(t)" title="改名">
                    <Pencil :size="13" />
                  </button>
                </div>
                <!-- 名稱列（編輯模式） -->
                <div v-else class="template-edit-row">
                  <input
                    class="template-name-input ds-input ds-input--sm"
                    v-model="editingName"
                    @keydown.enter="confirmEdit(t.id)"
                    @keydown.escape.stop="cancelEdit"
                  />
                  <button class="ds-btn ds-btn--ghost ds-btn--sm ds-btn--icon confirm-icon" @click="confirmEdit(t.id)" title="確認">
                    <Check :size="14" />
                  </button>
                  <button class="ds-btn ds-btn--ghost ds-btn--sm ds-btn--icon cancel-icon" @click="cancelEdit" title="取消">
                    <X :size="14" />
                  </button>
                </div>
                <p class="template-meta">{{ t.annotation_count }} 格答案區・{{ formatDate(t.created_at) }}</p>
              </div>
              <div class="template-actions">
                <button class="ds-btn ds-btn--primary ds-btn--sm" @click="selectTemplate(t)">選擇</button>
                <button class="ds-btn ds-btn--sm" @click="previewTemplate(t.id)"><Eye :size="14" /> 預覽</button>
                <button class="ds-btn ds-btn--danger ds-btn--sm" @click="requestDeleteTemplate(t)">刪除</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 刪除確認 overlay -->
        <div v-if="deleteConfirmId !== null" class="modal-inner-overlay">
          <div class="confirm-box">
            <p>確定要刪除「{{ deleteConfirmName }}」嗎？</p>
            <div class="confirm-actions">
              <button class="ds-btn" @click="cancelDelete">取消</button>
              <button class="ds-btn ds-btn--danger" @click="executeDeleteTemplate">確認刪除</button>
            </div>
          </div>
        </div>

        <!-- 圖片預覽 overlay -->
        <div v-if="previewImageUrl" class="modal-inner-overlay modal-preview-overlay">
          <button class="ds-btn ds-btn--sm preview-back-btn" @click="previewImageUrl = ''">
            <ArrowLeft :size="14" /> 返回清單
          </button>
          <img :src="previewImageUrl" class="preview-full-img" alt="模板預覽" />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Upload, ClipboardList, FileText, Files, Search,
  Pencil, Eye, X, Check, ArrowLeft, AlertCircle,
} from 'lucide-vue-next'
import { getStoreData, initializeFromUpload, hasData, clearAllData } from '../stores/resultsStore'
import { showToast } from '../composables/useFeedback'


interface FileWithPreview {
  file?: File
  name: string
  preview: string
}

interface TemplateAnnotation {
  class: string
  bbox: [number, number, number, number]
  answer: string
}

interface TemplatePage {
  image: string
  annotations: TemplateAnnotation[]
}

interface TemplateSummary {
  id: number
  exam_name: string
  annotation_count: number
  created_at: string
  image_url: string
}

interface TemplateDetail extends TemplateSummary {
  pages: TemplatePage[]
}

const router = useRouter()
const masterInput = ref<HTMLInputElement | null>(null)
const studentInput = ref<HTMLInputElement | null>(null)
const masterFile = ref<FileWithPreview | null>(null)
const studentFiles = ref<FileWithPreview[]>([])
const isDraggingMaster = ref(false)
const isDraggingStudents = ref(false)

// 模板相關
const showTemplateModal = ref(false)
const templates = ref<TemplateSummary[]>([])
const isLoadingTemplates = ref(false)
const templatesError = ref(false)
const isFromTemplate = ref(false)
const selectedTemplatePages = ref<TemplatePage[]>([])
const masterExamName = ref('')

// 搜尋
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

// 改名
const editingId = ref<number | null>(null)
const editingName = ref('')

// 刪除確認
const deleteConfirmId = ref<number | null>(null)
const deleteConfirmName = ref('')

// 圖片預覽
const previewImageUrl = ref('')

// 返回上傳頁時保留先前的標註，避免再次進入標註頁時遺失
const restoredMasterLabels = ref<any[]>([])
const restoredStudentLabels = new Map<string, any[]>()

// Esc 逐層關閉模板 modal（圖片預覽 → 刪除確認 → modal 本身）
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !showTemplateModal.value) return
  if (previewImageUrl.value) {
    previewImageUrl.value = ''
    return
  }
  if (deleteConfirmId.value !== null) {
    cancelDelete()
    return
  }
  closeTemplateModal()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if (hasData()) {
    const { studentImages, masterKeyImage } = getStoreData()
    if (masterKeyImage) {
      masterFile.value = { name: masterKeyImage.name, preview: masterKeyImage.preview }
      restoredMasterLabels.value = masterKeyImage.labels ?? []
      if (masterKeyImage.preview?.startsWith('/api/exam-templates')) {
        isFromTemplate.value = true
      } else {
        masterExamName.value = masterKeyImage.name
      }
    }
    if (studentImages.length > 0) {
      studentFiles.value = studentImages.map(img => ({ name: img.name, preview: img.preview }))
      studentImages.forEach(img => {
        if (img.labels && img.labels.length > 0) restoredStudentLabels.set(img.name, img.labels)
      })
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const triggerFileInput = (target: 'master' | 'students') => {
  if (target === 'master') masterInput.value?.click()
  else studentInput.value?.click()
}

const handleDragOver = (target: 'master' | 'students') => {
  if (target === 'master') isDraggingMaster.value = true
  else isDraggingStudents.value = true
}

const handleDragLeave = (target: 'master' | 'students') => {
  if (target === 'master') isDraggingMaster.value = false
  else isDraggingStudents.value = false
}

const handleDrop = (target: 'master' | 'students', event: DragEvent) => {
  if (target === 'master') isDraggingMaster.value = false
  else isDraggingStudents.value = false
  const files = event.dataTransfer?.files
  if (files) addFiles(target, Array.from(files))
}

const handleFileSelect = (target: 'master' | 'students', event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (files) addFiles(target, Array.from(files))
}

const addFiles = async (target: 'master' | 'students', files: File[]) => {
  const imageFiles = files.filter(file => file.type.startsWith('image/'))
  const skippedCount = files.length - imageFiles.length
  if (skippedCount > 0) {
    showToast(`已略過 ${skippedCount} 個非圖片檔案`, 'info')
  }

  const sortedFiles = imageFiles
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  let duplicateCount = 0
  for (const file of sortedFiles) {
    if (target === 'students' && studentFiles.value.some(f => f.name === file.name)) {
      duplicateCount++
      continue
    }
    const preview = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.readAsDataURL(file)
    })
    const previewData = { file, name: file.name, preview }
    if (target === 'master') {
      masterFile.value = previewData
      isFromTemplate.value = false
      selectedTemplatePages.value = []
      restoredMasterLabels.value = []
    } else {
      studentFiles.value.push(previewData)
      restoredStudentLabels.delete(file.name)
    }
  }
  if (duplicateCount > 0) {
    showToast(`已略過 ${duplicateCount} 個同名檔案`, 'info')
  }
}

const clearMaster = () => {
  masterFile.value = null
  isFromTemplate.value = false
  selectedTemplatePages.value = []
  masterExamName.value = ''
  restoredMasterLabels.value = []
}

const removeStudent = (index: number) => {
  const removed = studentFiles.value.splice(index, 1)[0]
  if (removed) restoredStudentLabels.delete(removed.name)
}

const clearAll = () => {
  masterFile.value = null
  studentFiles.value = []
  isFromTemplate.value = false
  selectedTemplatePages.value = []
  masterExamName.value = ''
  restoredMasterLabels.value = []
  restoredStudentLabels.clear()
  clearAllData()
}

// ── 模板相關 ──────────────────────────────────────────────────────────────────

const loadTemplates = async (search = '') => {
  isLoadingTemplates.value = true
  templatesError.value = false
  try {
    const url = search
      ? `/api/exam-templates?search=${encodeURIComponent(search)}`
      : '/api/exam-templates'
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    templates.value = data.templates ?? []
  } catch (error) {
    console.error('載入模板清單失敗:', error)
    templates.value = []
    templatesError.value = true
  } finally {
    isLoadingTemplates.value = false
  }
}

const openTemplateModal = async () => {
  showTemplateModal.value = true
  searchQuery.value = ''
  await loadTemplates()
}

const closeTemplateModal = () => {
  showTemplateModal.value = false
  editingId.value = null
  editingName.value = ''
  deleteConfirmId.value = null
  deleteConfirmName.value = ''
  previewImageUrl.value = ''
  searchQuery.value = ''
}

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadTemplates(searchQuery.value), 300)
}

// ── 改名 ──────────────────────────────────────────────────────────────────────

const startEdit = async (t: TemplateSummary) => {
  editingId.value = t.id
  editingName.value = t.exam_name
  await nextTick()
  ;(document.querySelector('.template-name-input') as HTMLInputElement)?.focus()
}

const cancelEdit = () => {
  editingId.value = null
  editingName.value = ''
}

const confirmEdit = async (id: number) => {
  const name = editingName.value.trim()
  if (!name) { cancelEdit(); return }
  try {
    const res = await fetch(`/api/exam-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam_name: name })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const t = templates.value.find(t => t.id === id)
    if (t) t.exam_name = data.exam_name ?? name
  } catch (error) {
    console.error('模板改名失敗:', error)
    showToast('改名失敗，請稍後再試', 'error')
  }
  cancelEdit()
}

// ── 刪除 ──────────────────────────────────────────────────────────────────────

const requestDeleteTemplate = (t: TemplateSummary) => {
  deleteConfirmId.value = t.id
  deleteConfirmName.value = t.exam_name
}

const cancelDelete = () => {
  deleteConfirmId.value = null
  deleteConfirmName.value = ''
}

const executeDeleteTemplate = async () => {
  if (deleteConfirmId.value === null) return
  try {
    const res = await fetch(`/api/exam-templates/${deleteConfirmId.value}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    templates.value = templates.value.filter(t => t.id !== deleteConfirmId.value)
    showToast('已刪除模板', 'success')
  } catch (error) {
    console.error('刪除模板失敗:', error)
    showToast('刪除失敗，請稍後再試', 'error')
  }
  cancelDelete()
}

// ── 預覽 ──────────────────────────────────────────────────────────────────────

const previewTemplate = (id: number) => {
  previewImageUrl.value = `/api/exam-templates/${id}/image`
}

// ── 選擇模板套用 ──────────────────────────────────────────────────────────────

const selectTemplate = async (t: TemplateSummary) => {
  try {
    const res = await fetch(`/api/exam-templates/${t.id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: TemplateDetail = await res.json()

    masterFile.value = {
      name: data.exam_name,
      preview: data.image_url
    }
    isFromTemplate.value = true
    selectedTemplatePages.value = data.pages ?? []
    restoredMasterLabels.value = []
    closeTemplateModal()
  } catch (error) {
    console.error('載入模板失敗:', error)
    showToast('載入模板失敗，請稍後再試', 'error')
  }
}

const formatDate = (iso: string) => {
  return iso.slice(0, 10).replace(/-/g, '/')
}

// ── 上傳並前往標註頁 ──────────────────────────────────────────────────────────

const uploadFiles = () => {
  if (!masterFile.value) {
    showToast('請先上傳標準答案卷', 'error')
    return
  }
  if (!isFromTemplate.value && !masterExamName.value.trim()) {
    showToast('請輸入考卷名稱後再繼續', 'error')
    return
  }
  if (studentFiles.value.length === 0) {
    showToast('請至少上傳一張學生考卷', 'error')
    return
  }

  // 答案卷標註來源：剛選的模板 > 先前保留的標註 > 空（進標註頁自動偵測）
  const masterLabels = selectedTemplatePages.value.length > 0
    ? selectedTemplatePages.value.flatMap(page =>
        page.annotations.map(ann => ({
          class: ann.class,
          x: ann.bbox[0],
          y: ann.bbox[1],
          width: ann.bbox[2],
          height: ann.bbox[3],
          expectedAnswer: ann.answer || '',
          answer: ''
        }))
      )
    : restoredMasterLabels.value

  const masterData = {
    name: masterExamName.value.trim() || masterFile.value.name,
    preview: masterFile.value.preview,
    labels: masterLabels,
    role: 'master' as const,
    predictionsLoaded: isFromTemplate.value || masterLabels.length > 0
  }

  const filesData = studentFiles.value.map(f => {
    const labels = restoredStudentLabels.get(f.name) ?? []
    return {
      name: f.name,
      preview: f.preview,
      labels,
      role: 'student' as const,
      predictionsLoaded: labels.length > 0
    }
  })

  initializeFromUpload(filesData, masterData)
  router.push({ name: 'label' })
}
</script>

<style scoped>
.upload-container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-8) var(--page-pad);
}

.page-desc {
  margin-bottom: 28px;
}

.upload-area {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 900px) {
  .upload-area {
    grid-template-columns: 1fr;
  }
}

.upload-section {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.section-title {
  margin: 0 0 12px;
}

.file-list h3 {
  margin: 0 0 8px;
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--text-1);
}

/* 答案卷兩個選項並排 */
.master-input-area {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: 12px;
}

.or-divider {
  align-self: center;
  color: var(--text-3);
  font-size: var(--text-sm);
  text-align: center;
}

.file-ic {
  color: var(--text-2);
  flex-shrink: 0;
}

.file-ic--faint {
  color: var(--text-3);
}

.file-list {
  margin-top: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 40px;
}

/* Modal 搜尋欄 */
.modal-search {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.modal-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: var(--text-3);
  padding: 32px 0;
}

.modal-status--error {
  color: var(--danger);
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-card);
  transition: border-color var(--duration-fast) var(--ease);
}

.template-item:hover {
  border-color: var(--border-strong);
}

.template-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

/* 名稱列 */
.template-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.template-name {
  font-weight: var(--weight-medium);
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 編輯列 */
.template-edit-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.template-name-input {
  flex: 1;
  min-width: 0;
}

.confirm-icon {
  color: var(--status-correct);
}

.cancel-icon {
  color: var(--danger);
}

.template-meta {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-3);
  font-family: var(--font-mono);
}

/* 三顆按鈕（橫排） */
.template-actions {
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

/* Inner overlay（刪除確認 / 圖片預覽）— 蓋在 modal 上 */
.modal-inner-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.97);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* 刪除確認框 */
.confirm-box {
  text-align: center;
  padding: 32px 40px;
}

.confirm-box p {
  font-size: var(--text-md);
  color: var(--text-1);
  margin: 0 0 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* 圖片預覽 overlay */
.modal-preview-overlay {
  background: var(--gray-900);
  padding: 56px 24px 24px;
}

.preview-back-btn {
  position: absolute;
  top: 12px;
  left: 12px;
}

.preview-full-img {
  max-width: 100%;
  max-height: calc(85vh - 6rem);
  object-fit: contain;
  border-radius: var(--radius-sm);
}

/* 答案卷預覽（已選擇後） */
.master-preview {
  padding: 0;
  overflow: hidden;
}

.master-preview-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-default);
}

.filename-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filename-row .file-name {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-weight: var(--weight-medium);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.master-preview-figure {
  padding: 16px;
  background: var(--surface-sunken);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.master-preview-image {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  margin: 0 auto;
  object-fit: contain;
  box-shadow: var(--shadow-sm);
  border-radius: 2px;
}

/* 學生考卷清單 */
.file-name-list {
  display: flex;
  flex-direction: column;
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  overflow-y: auto;
  max-height: 320px;
}

.file-name-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid var(--gray-100);
}

.file-name-item:last-child {
  border-bottom: none;
}

.file-name-item:hover {
  background: var(--surface-hover);
}

.file-name-text {
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<template>
  <div class="upload-container">
    <h1>上傳圖片</h1>
    <div class="upload-area">

      <!-- 標準答案卷 -->
      <div class="upload-section">
        <h2>標準答案卷</h2>

        <!-- 未選擇時：上傳 or 選模板 並排 -->
        <div v-if="!masterFile" class="master-input-area">
          <div
            class="drop-zone"
            @dragover.prevent="handleDragOver('master')"
            @dragleave.prevent="handleDragLeave('master')"
            @drop.prevent="handleDrop('master', $event)"
            :class="{ 'drag-over': isDraggingMaster }"
          >
            <div class="upload-icon">📁</div>
            <p>拖曳或點擊上傳 1 張標準答案卷</p>
            <input
              type="file"
              ref="masterInput"
              @change="handleFileSelect('master', $event)"
              accept="image/*"
              style="display: none"
            />
            <button @click="triggerFileInput('master')" class="select-btn">選擇標準答案卷</button>
          </div>

          <div class="or-divider">或</div>

          <div class="drop-zone template-zone" @click="openTemplateModal">
            <div class="upload-icon">📋</div>
            <p>使用已儲存的答案卷</p>
            <button class="select-btn template-btn" @click.stop="openTemplateModal">選擇已儲存答案卷</button>
          </div>
        </div>

        <!-- 已選擇後：上資訊下圖 -->
        <div v-if="masterFile" class="master-preview">
          <div class="master-preview-info">
            <div class="filename-row">
              <p class="file-name">{{ masterFile.name }}</p>
              <button @click="clearMaster" class="remove-btn small-btn">移除</button>
            </div>
            <input
              v-if="!isFromTemplate"
              type="text"
              v-model="masterExamName"
              placeholder="請輸入考卷名稱"
              class="exam-name-input"
            />
            <span v-else class="template-source-hint">來自已儲存模板</span>
          </div>
          <img :src="masterFile.preview" :alt="masterFile.name" class="master-preview-image" />
        </div>
      </div>

      <!-- 學生考卷 -->
      <div class="upload-section">
        <h2>學生考卷</h2>
        <div
          class="drop-zone"
          @dragover.prevent="handleDragOver('students')"
          @dragleave.prevent="handleDragLeave('students')"
          @drop.prevent="handleDrop('students', $event)"
          :class="{ 'drag-over': isDraggingStudents }"
        >
          <div class="upload-icon">🗂️</div>
          <p>拖曳或點擊上傳多張學生考卷</p>
          <input
            type="file"
            ref="studentInput"
            @change="handleFileSelect('students', $event)"
            multiple
            accept="image/*"
            style="display: none"
          />
          <button @click="triggerFileInput('students')" class="select-btn">選擇學生考卷</button>
        </div>
        <div v-if="studentFiles.length > 0" class="file-list">
          <h3>已選擇圖片 ({{ studentFiles.length }})</h3>
          <div class="file-name-list">
            <div v-for="(file, index) in studentFiles" :key="index" class="file-name-item">
              <span class="file-icon">📄</span>
              <span class="file-name-text">{{ file.name }}</span>
              <button @click="removeStudent(index)" class="remove-text-btn">移除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="masterFile || studentFiles.length > 0" class="file-list">
      <div class="action-buttons">
        <button @click="clearAll" class="clear-btn">清除全部</button>
        <button @click="uploadFiles" class="upload-btn" :disabled="isUploading">
          {{ isUploading ? '上傳中...' : '上傳並標註' }}
        </button>
      </div>
    </div>

    <!-- 選擇模板 Modal -->
    <div v-if="showTemplateModal" class="modal-overlay" @click.self="closeTemplateModal">
      <div class="modal">
        <div class="modal-header">
          <h3>選擇已儲存的答案卷模板</h3>
          <button class="modal-close" @click="closeTemplateModal">✕</button>
        </div>

        <!-- 搜尋欄 -->
        <div class="modal-search">
          <input
            type="text"
            v-model="searchQuery"
            @input="onSearchInput"
            placeholder="🔍 搜尋模板名稱..."
            class="search-input"
          />
        </div>

        <div class="modal-body">
          <div v-if="isLoadingTemplates" class="modal-status">載入中...</div>
          <div v-else-if="templates.length === 0" class="modal-status">
            {{ searchQuery ? '找不到符合的模板' : '尚無儲存的模板' }}
          </div>
          <div v-else class="template-list">
            <div v-for="t in templates" :key="t.id" class="template-item">
              <div class="template-info">
                <!-- 名稱列（一般模式） -->
                <div v-if="editingId !== t.id" class="template-name-row">
                  <span class="template-name">{{ t.exam_name }}</span>
                  <button class="icon-btn" @click="startEdit(t)" title="改名">✏️</button>
                </div>
                <!-- 名稱列（編輯模式） -->
                <div v-else class="template-edit-row">
                  <input
                    class="template-name-input"
                    v-model="editingName"
                    @keydown.enter="confirmEdit(t.id)"
                    @keydown.escape="cancelEdit"
                  />
                  <button class="icon-btn confirm-icon" @click="confirmEdit(t.id)" title="確認">✔</button>
                  <button class="icon-btn cancel-icon" @click="cancelEdit" title="取消">✕</button>
                </div>
                <p class="template-meta">{{ t.annotation_count }} 格答案區・{{ formatDate(t.created_at) }}</p>
              </div>
              <div class="template-actions">
                <button class="select-btn small-btn" @click="selectTemplate(t)">選擇</button>
                <button class="preview-btn small-btn" @click="previewTemplate(t.id)">預覽</button>
                <button class="remove-btn small-btn" @click="requestDeleteTemplate(t)">刪除</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 刪除確認 overlay -->
        <div v-if="deleteConfirmId !== null" class="modal-inner-overlay">
          <div class="confirm-box">
            <p>確定要刪除「{{ deleteConfirmName }}」嗎？</p>
            <div class="confirm-actions">
              <button class="cancel-confirm-btn" @click="cancelDelete">取消</button>
              <button class="delete-confirm-btn" @click="executeDeleteTemplate">確認刪除</button>
            </div>
          </div>
        </div>

        <!-- 圖片預覽 overlay -->
        <div v-if="previewImageUrl" class="modal-inner-overlay modal-preview-overlay">
          <button class="preview-back-btn" @click="previewImageUrl = ''">← 返回清單</button>
          <img :src="previewImageUrl" class="preview-full-img" alt="模板預覽" />
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getStoreData, initializeFromUpload, hasData, clearAllData } from '../stores/resultsStore'


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
const isUploading = ref(false)

// 模板相關
const showTemplateModal = ref(false)
const templates = ref<TemplateSummary[]>([])
const isLoadingTemplates = ref(false)
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

onMounted(() => {
  if (hasData()) {
    const { studentImages, masterKeyImage } = getStoreData()
    if (masterKeyImage) {
      masterFile.value = { name: masterKeyImage.name, preview: masterKeyImage.preview }
      if (masterKeyImage.preview?.startsWith('/api/exam-templates')) {
        isFromTemplate.value = true
      } else {
        masterExamName.value = masterKeyImage.name
      }
    }
    if (studentImages.length > 0) {
      studentFiles.value = studentImages.map(img => ({ name: img.name, preview: img.preview }))
    }
  }
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
  const sortedFiles = [...files]
    .filter(file => file.type.startsWith('image/'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  for (const file of sortedFiles) {
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
    } else {
      studentFiles.value.push(previewData)
    }
  }
}

const clearMaster = () => {
  masterFile.value = null
  isFromTemplate.value = false
  selectedTemplatePages.value = []
  masterExamName.value = ''
}

const removeStudent = (index: number) => {
  studentFiles.value.splice(index, 1)
}

const clearAll = () => {
  masterFile.value = null
  studentFiles.value = []
  isFromTemplate.value = false
  selectedTemplatePages.value = []
  masterExamName.value = ''
  clearAllData()
}

// ── 模板相關 ──────────────────────────────────────────────────────────────────

const loadTemplates = async (search = '') => {
  isLoadingTemplates.value = true
  try {
    const url = search
      ? `/api/exam-templates?search=${encodeURIComponent(search)}`
      : '/api/exam-templates'
    const res = await fetch(url)
    const data = await res.json()
    templates.value = data.templates ?? []
  } catch {
    alert('無法連線到模板伺服器')
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
    const data = await res.json()
    const t = templates.value.find(t => t.id === id)
    if (t) t.exam_name = data.exam_name
  } catch {
    alert('改名失敗')
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
    await fetch(`/api/exam-templates/${deleteConfirmId.value}`, { method: 'DELETE' })
    templates.value = templates.value.filter(t => t.id !== deleteConfirmId.value)
  } catch {
    alert('刪除失敗')
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
    const data: TemplateDetail = await res.json()

    masterFile.value = {
      name: data.exam_name,
      preview: data.image_url
    }
    isFromTemplate.value = true
    selectedTemplatePages.value = data.pages
    closeTemplateModal()
  } catch {
    alert('載入模板失敗')
  }
}

const formatDate = (iso: string) => {
  return iso.slice(0, 10).replace(/-/g, '/')
}

// ── 上傳並前往標註頁 ──────────────────────────────────────────────────────────

const uploadFiles = () => {
  if (!masterFile.value) {
    alert('請先上傳標準答案卷。')
    return
  }
  if (!isFromTemplate.value && !masterExamName.value.trim()) {
    alert('請輸入考卷名稱後再繼續。')
    return
  }
  if (studentFiles.value.length === 0) {
    alert('請至少上傳一張學生考卷。')
    return
  }
  isUploading.value = true

  setTimeout(() => {
    isUploading.value = false

    // 若來自模板，把 annotations 轉成 labels 格式
    const masterLabels = isFromTemplate.value
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
      : []

    const masterData = {
      name: masterExamName.value.trim() || masterFile.value!.name,
      preview: masterFile.value!.preview,
      labels: masterLabels,
      role: 'master' as const,
      predictionsLoaded: isFromTemplate.value
    }

    const filesData = studentFiles.value.map(f => ({
      name: f.name,
      preview: f.preview,
      labels: [],
      role: 'student' as const,
      predictionsLoaded: false
    }))

    initializeFromUpload(filesData, masterData)
    router.push({ name: 'label' })
  }, 1000)
}
</script>

<style scoped>
.upload-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem 2rem 2rem;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.upload-area {
  display: grid;
  gap: 2rem;
  margin-bottom: 2rem;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upload-section h2 {
  margin: 0;
  color: #2c3e50;
}

.upload-section h3 {
  margin: 0 0 0.75rem;
  color: #2c3e50;
  font-size: 1rem;
}

/* 答案卷兩個選項並排 */
.master-input-area {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
}

.or-divider {
  font-size: 1.1rem;
  color: #999;
  font-weight: bold;
  text-align: center;
}

.drop-zone {
  border: 3px dashed #ccc;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  background-color: #f9f9f9;
  transition: all 0.3s ease;
  cursor: pointer;
}

.drop-zone.drag-over {
  border-color: #42b883;
  background-color: #e8f5e9;
}

.template-zone {
  border-color: #4a90e2;
  background-color: #f0f6ff;
}

.template-zone:hover {
  border-color: #2c6db5;
  background-color: #e3eeff;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.drop-zone p {
  color: #666;
  margin-bottom: 1rem;
}

.select-btn {
  background-color: #42b883;
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.select-btn:hover {
  background-color: #35945d;
}

.template-btn {
  background-color: #4a90e2;
}

.template-btn:hover {
  background-color: #2c6db5;
}

.small-btn {
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
}

/* 模板 badge */
.template-badge {
  display: inline-block;
  background-color: #e3eeff;
  color: #2c6db5;
  border: 1px solid #4a90e2;
  border-radius: 4px;
  font-size: 0.78rem;
  padding: 0.15rem 0.5rem;
  margin: 0.25rem 0;
}

.file-list {
  margin-top: 2rem;
}

.file-list h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.file-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1rem;
  text-align: center;
  background-color: white;
}

.preview-image {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.file-name {
  font-size: 0.875rem;
  color: #666;
  margin: 0.5rem 0;
  word-break: break-all;
}

.remove-btn {
  background-color: #ff5252;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.remove-btn:hover {
  background-color: #d32f2f;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.clear-btn,
.upload-btn {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.clear-btn {
  background-color: #666;
  color: white;
}

.clear-btn:hover {
  background-color: #555;
}

.upload-btn {
  background-color: #42b883;
  color: white;
}

.upload-btn:hover:not(:disabled) {
  background-color: #35945d;
}

.upload-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 10px;
  width: 680px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #999;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.modal-close:hover {
  background: #f0f0f0;
  color: #333;
}

/* 搜尋欄 */
.modal-search {
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #4a90e2;
}

.modal-body {
  overflow-y: auto;
  padding: 1rem 1.5rem;
  flex: 1;
}

.modal-status {
  text-align: center;
  color: #999;
  padding: 2rem 0;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.template-item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: #fafafa;
  transition: background 0.2s;
}

.template-item:hover {
  background: #f0f6ff;
  border-color: #4a90e2;
}

.template-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

/* 名稱列 */
.template-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.template-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 編輯列 */
.template-edit-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.template-name-input {
  flex: 1;
  min-width: 0;
  border: 1px solid #4a90e2;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  outline: none;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.15rem 0.35rem;
  font-size: 0.85rem;
  border-radius: 3px;
  line-height: 1;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: #f0f0f0;
}

.confirm-icon {
  color: #42b883;
}

.cancel-icon {
  color: #ff5252;
}

.template-meta {
  margin: 0;
  font-size: 0.82rem;
  color: #888;
}

/* 三顆按鈕（橫排） */
.template-actions {
  display: flex;
  flex-direction: row;
  gap: 0.4rem;
  align-items: center;
  flex-shrink: 0;
}

/* 預覽按鈕 */
.preview-btn {
  background-color: #6c8ebf;
  color: white;
  border: none;
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.preview-btn:hover {
  background-color: #4a6fa5;
}

/* Inner overlay（刪除確認 / 圖片預覽）— 蓋在 modal 上 */
.modal-inner-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* 刪除確認框 */
.confirm-box {
  text-align: center;
  padding: 2rem 2.5rem;
}

.confirm-box p {
  font-size: 1rem;
  color: #2c3e50;
  margin: 0 0 1.5rem;
}

.confirm-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.cancel-confirm-btn {
  background: #e0e0e0;
  color: #333;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.2s;
}

.cancel-confirm-btn:hover {
  background: #ccc;
}

.delete-confirm-btn {
  background: #ff5252;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.2s;
}

.delete-confirm-btn:hover {
  background: #d32f2f;
}

/* 圖片預覽 overlay */
.modal-preview-overlay {
  background: rgba(17, 17, 17, 0.95);
  padding: 3rem 1.5rem 1.5rem;
}

.preview-back-btn {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  padding: 0.4rem 0.9rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.preview-back-btn:hover {
  background: white;
}

.preview-full-img {
  max-width: 100%;
  max-height: calc(80vh - 5rem);
  object-fit: contain;
  border-radius: 4px;
}

/* 答案卷預覽（已選擇後） */
.master-preview {
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.master-preview-image {
  width: 100%;
  max-height: 60vh;
  object-fit: contain;
  background: #f0f0f0;
  display: block;
}

.master-preview-info {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #eee;
}


.filename-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.filename-row .file-name {
  margin: 0;
  flex: 1;
}

.master-preview-info .file-name {
  font-size: 1.2rem;
  color: #444;
}

.master-preview-info .remove-btn {
  font-size: 1.2rem;
  padding: 0.5rem 1.1rem;
}

.exam-name-input {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.6rem 0.9rem;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.exam-name-input:focus {
  outline: none;
  border-color: #42b883;
}

.template-source-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #4a90e2;
}

.file-name-list {
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow-y: auto;
  max-height: 320px;
}

.file-name-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  background: white;
  transition: background 0.15s;
}

.file-name-item:last-child {
  border-bottom: none;
}

.file-name-item:hover {
  background: #f8f8f8;
}

.file-icon {
  font-size: 0.95rem;
  flex-shrink: 0;
}

.file-name-text {
  flex: 1;
  font-size: 0.9rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-text-btn {
  background: none;
  border: 1px solid #ffb3b3;
  color: #e53935;
  border-radius: 4px;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.remove-text-btn:hover {
  background: #fff0f0;
}
</style>

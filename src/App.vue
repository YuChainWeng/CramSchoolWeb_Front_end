<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { Upload, SquareDashedMousePointer, LayoutGrid } from 'lucide-vue-next'
import FeedbackHost from './components/FeedbackHost.vue'
</script>

<template>
  <div id="app">
    <header class="app-header">
      <div class="header-content">
        <span class="app-title">
          <!-- 品牌標誌：答案區虛線框＋批改勾號 -->
          <svg class="brand-mark" width="24" height="24" viewBox="0 0 24 24" aria-label="批改系統">
            <rect x="0" y="0" width="24" height="24" rx="6" fill="var(--accent)" />
            <rect x="5" y="8" width="14" height="9.5" rx="1.5" fill="none"
              stroke="rgba(255,255,255,0.55)" stroke-width="1.3" stroke-dasharray="2.6 2" />
            <path d="M8.5 12.2 L11 14.7 L16.5 7.5" fill="none"
              stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          閱卷通
          <span class="app-subtitle">手寫考卷自動批改系統</span>
        </span>
        <nav>
          <RouterLink to="/"><Upload :size="14" /> 上傳</RouterLink>
          <RouterLink to="/label"><SquareDashedMousePointer :size="14" /> 標註</RouterLink>
          <RouterLink to="/results"><LayoutGrid :size="14" /> 結果</RouterLink>
        </nav>
        <span class="flow-hint">上傳 → 標註 → 結果</span>
      </div>
    </header>

    <main>
      <RouterView />
    </main>

    <FeedbackHost />
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: var(--surface-card);
  border-bottom: 1px solid var(--border-default);
  height: 56px;
  flex-shrink: 0;
}

.header-content {
  max-width: var(--container-max);
  margin: 0 auto;
  height: 100%;
  padding: 0 var(--page-pad);
  display: flex;
  align-items: center;
  gap: 32px;
}

.app-title {
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  color: var(--text-1);
  letter-spacing: 0.02em;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* 產品名後的說明文字，權重降低以突顯品牌名 */
.app-subtitle {
  font-size: var(--text-sm);
  font-weight: var(--weight-regular);
  color: var(--text-3);
  letter-spacing: 0;
  padding-left: 8px;
  border-left: 1px solid var(--border-default);
}

.brand-mark {
  flex-shrink: 0;
  display: block;
}

nav {
  display: flex;
  gap: 4px;
}

nav a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  cursor: pointer;
  user-select: none;
  font-weight: var(--weight-regular);
  color: var(--text-2);
  background: transparent;
  transition:
    background var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
  text-decoration: none;
}

nav a:hover {
  background: var(--surface-hover);
}

nav a.router-link-exact-active {
  font-weight: var(--weight-medium);
  color: var(--text-1);
  background: var(--surface-active);
}

.flow-hint {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--text-3);
  white-space: nowrap;
}

main {
  flex: 1;
  background: var(--surface-page);
}

@media (max-width: 768px) {
  .app-header {
    height: auto;
  }

  .header-content {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 16px;
  }

  .flow-hint {
    display: none;
  }
}
</style>

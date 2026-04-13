<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<template>
  <section class="wrap" aria-label="模型流式输出">
    <header class="hd">
      <div class="t">LLM 流式视图</div>
      <div class="sub">与 ChatOpenAI 流式体验对齐（演示）</div>
    </header>
    <div class="viewport">
      <div class="stream" role="log" aria-live="polite">
        <span class="text">{{ text }}</span><span v-if="text" class="caret" aria-hidden="true" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.wrap {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: linear-gradient(180deg, rgba(12, 18, 40, 0.55), rgba(0, 0, 0, 0.18));
  overflow: hidden;
  min-height: 220px;
  display: flex;
  flex-direction: column;
}

.hd {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(120, 200, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.t {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(232, 240, 255, 0.78);
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.viewport {
  position: relative;
  padding: 12px;
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
}

.stream {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12.5px;
  line-height: 1.6;
  color: rgba(232, 240, 255, 0.92);
}

.text {
  white-space: pre-wrap;
}

.caret {
  display: inline-block;
  width: 8px;
  height: 14px;
  margin-left: 2px;
  vertical-align: -2px;
  background: linear-gradient(180deg, rgba(94, 234, 212, 0.95), rgba(56, 189, 248, 0.55));
  border-radius: 2px;
  animation: blink 1.05s steps(2, end) infinite;
  transform: translateZ(0);
}

@keyframes blink {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.15;
  }
  100% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .caret {
    animation: none;
    opacity: 0.55;
  }
}
</style>

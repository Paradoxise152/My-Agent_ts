<script setup lang="ts">
defineProps<{
  text: string;
}>();
</script>

<template>
  <section class="card" aria-label="检索上下文">
    <header class="hd">
      <div class="t">RAG 上下文</div>
      <div class="dot" />
    </header>
    <div class="body">
      <pre class="pre">{{ text || "等待检索…" }}</pre>
    </div>
  </section>
</template>

<style scoped>
.card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.18);
  overflow: hidden;
  min-height: 160px;
}

.hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(94, 234, 212, 0.95), rgba(56, 189, 248, 0.35));
  box-shadow: 0 0 18px rgba(94, 234, 212, 0.35);
}

.body {
  padding: 12px;
}

.pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.55;
  color: rgba(232, 240, 255, 0.86);
}
</style>

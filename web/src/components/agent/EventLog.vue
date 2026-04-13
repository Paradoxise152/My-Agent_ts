<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { LogEntry } from "@/composables/useAgentSimulation";

const props = defineProps<{
  items: LogEntry[];
}>();

const root = ref<HTMLElement | null>(null);

watch(
  () => props.items.length,
  async () => {
    await nextTick();
    const el = root.value;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  },
);

function levelClass(level: LogEntry["level"]) {
  return `lvl lvl-${level}`;
}
</script>

<template>
  <section class="log" aria-label="事件时间线">
    <header class="hd">
      <div class="t">事件时间线</div>
      <div class="sub">可观测、可回放</div>
    </header>
    <div ref="root" class="scroller" tabindex="0">
      <ol class="ol">
        <li v-for="e in items" :key="e.id" class="row">
          <div class="rail" aria-hidden="true" />
          <div class="bubble">
            <div class="top">
              <span :class="levelClass(e.level)">{{ e.level }}</span>
              <time class="time" :datetime="new Date(e.ts).toISOString()">{{ new Date(e.ts).toLocaleTimeString() }}</time>
            </div>
            <div class="title">{{ e.title }}</div>
            <pre v-if="e.detail" class="detail">{{ e.detail }}</pre>
          </div>
        </li>
      </ol>
      <div v-if="items.length === 0" class="empty">等待事件…</div>
    </div>
  </section>
</template>

<style scoped>
.log {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.16);
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

.scroller {
  flex: 1;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 10px;
}

.ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.row {
  display: grid;
  grid-template-columns: 10px 1fr;
  gap: 10px;
  align-items: stretch;
}

.rail {
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(94, 234, 212, 0.55), rgba(56, 189, 248, 0.15));
  justify-self: center;
  opacity: 0.9;
}

.bubble {
  border-radius: 12px;
  border: 1px solid rgba(120, 200, 255, 0.12);
  background: rgba(12, 18, 40, 0.35);
  padding: 10px;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.lvl {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(232, 240, 255, 0.72);
}

.lvl-info {
  border-color: rgba(120, 200, 255, 0.16);
}
.lvl-model {
  border-color: rgba(94, 234, 212, 0.22);
  color: rgba(167, 243, 208, 0.95);
}
.lvl-tool {
  border-color: rgba(251, 113, 133, 0.22);
  color: rgba(255, 200, 210, 0.92);
}
.lvl-warn {
  border-color: rgba(250, 204, 21, 0.22);
  color: rgba(254, 240, 138, 0.92);
}

.time {
  font-size: 11px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.title {
  margin-top: 8px;
  font-size: 13px;
}

.detail {
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(232, 240, 255, 0.78);
}

.empty {
  padding: 14px 6px;
  color: var(--muted);
  font-size: 12px;
}
</style>

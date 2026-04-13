<script setup lang="ts">
import type { ToolCallPreview } from "@/composables/useAgentSimulation";

defineProps<{
  items: ToolCallPreview[];
}>();
</script>

<template>
  <section class="deck" aria-label="工具调用">
    <header class="hd">
      <div class="t">MCP 工具调用</div>
      <div class="sub">Agent.ts 工具循环的可视化摘要</div>
    </header>

    <ul class="list">
      <li v-for="(it, idx) in items" :key="it.id" class="card" :style="{ transitionDelay: `${idx * 40}ms` }">
        <div class="top">
          <div class="name">{{ it.name }}</div>
          <div class="chip">call</div>
        </div>
        <div class="row">
          <div class="k">args</div>
          <div class="v mono">{{ it.argsSummary }}</div>
        </div>
        <div class="row">
          <div class="k">result</div>
          <div class="v">{{ it.resultSummary }}</div>
        </div>
      </li>
      <li v-if="items.length === 0" class="empty">尚无工具调用</li>
    </ul>
  </section>
</template>

<style scoped>
.deck {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: rgba(0, 0, 0, 0.16);
  overflow: hidden;
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

.list {
  list-style: none;
  margin: 0;
  padding: 10px;
  display: grid;
  gap: 10px;
}

.card {
  border-radius: 12px;
  border: 1px solid rgba(120, 200, 255, 0.12);
  background: linear-gradient(180deg, rgba(12, 18, 40, 0.55), rgba(0, 0, 0, 0.12));
  padding: 10px 10px 8px;
  transform: translateZ(0);
  transition: border-color 240ms var(--ease-out), transform 240ms var(--ease-spring), opacity 240ms var(--ease-out);
  animation: enter 520ms var(--ease-out) both;
}

.card:hover {
  border-color: rgba(94, 234, 212, 0.22);
  transform: translateY(-1px);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.name {
  font-size: 13px;
  letter-spacing: 0.02em;
}

.chip {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(251, 113, 133, 0.22);
  color: rgba(255, 200, 210, 0.85);
  background: rgba(251, 113, 133, 0.06);
}

.row {
  display: grid;
  grid-template-columns: 54px 1fr;
  gap: 10px;
  padding: 6px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.k {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.v {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(232, 240, 255, 0.86);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.empty {
  padding: 14px 10px;
  color: var(--muted);
  font-size: 12px;
}

@keyframes enter {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}
</style>

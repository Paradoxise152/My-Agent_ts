<script setup lang="ts">
import { computed } from "vue";
import type { PipelineId } from "@/composables/useAgentSimulation";

const props = defineProps<{
  active: PipelineId | null;
  running: boolean;
  progress: number;
}>();

const steps = computed(() => {
  const ids: PipelineId[] = ["rag", "init", "llm", "tool", "done"];
  const labels: Record<PipelineId, { t: string; s: string }> = {
    rag: { t: "RAG", s: "向量检索" },
    init: { t: "INIT", s: "MCP / 工具" },
    llm: { t: "LLM", s: "推理 / 回填" },
    tool: { t: "TOOL", s: "外部调用" },
    done: { t: "DONE", s: "收尾" },
  };
  return ids.map((id) => ({ id, ...labels[id] }));
});

function stateFor(id: PipelineId) {
  if (!props.running && !props.active) return "idle";
  if (props.active === id) return "active";
  const order: PipelineId[] = ["rag", "init", "llm", "tool", "done"];
  const ai = props.active ? order.indexOf(props.active) : -1;
  const bi = order.indexOf(id);
  if (ai < 0) return "idle";
  return bi < ai ? "done" : bi === ai ? "active" : "idle";
}
</script>

<template>
  <section class="rail" aria-label="执行管线">
    <header class="rail-head">
      <div class="title">执行管线</div>
      <div class="meter" role="progressbar" :aria-valuenow="Math.round(progress * 100)" aria-valuemin="0" aria-valuemax="100">
        <div class="meter-fill" :style="{ transform: `scaleX(${progress})` }" />
      </div>
    </header>

    <ol class="steps">
      <li v-for="s in steps" :key="s.id" class="step" :data-state="stateFor(s.id)">
        <div class="node">
          <span class="pulse" v-if="stateFor(s.id) === 'active'" />
        </div>
        <div class="meta">
          <div class="t">{{ s.t }}</div>
          <div class="s">{{ s.s }}</div>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.rail {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(12, 18, 40, 0.72), rgba(8, 12, 26, 0.55));
  border-radius: var(--radius);
  padding: 14px 14px 12px;
  backdrop-filter: blur(10px);
}

.rail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 2px 10px;
}

.title {
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.meter {
  height: 6px;
  width: 120px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.meter-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(94, 234, 212, 0.25), rgba(56, 189, 248, 0.95));
  box-shadow: 0 0 18px var(--glow);
  transition: transform 520ms var(--ease-out);
  will-change: transform;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.step {
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: border-color 240ms var(--ease-out), background 240ms var(--ease-out), transform 240ms var(--ease-spring);
}

.step[data-state="active"] {
  border-color: rgba(94, 234, 212, 0.22);
  background: rgba(94, 234, 212, 0.06);
  transform: translateX(2px);
}

.step[data-state="done"] {
  border-color: rgba(120, 200, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.node {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  position: relative;
  border: 1px solid rgba(120, 200, 255, 0.16);
  background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.05));
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
}

.step[data-state="active"] .node {
  border-color: rgba(94, 234, 212, 0.45);
  box-shadow: 0 0 0 1px rgba(94, 234, 212, 0.12), 0 10px 30px rgba(56, 189, 248, 0.12);
}

.step[data-state="done"] .node {
  border-color: rgba(56, 189, 248, 0.22);
}

.pulse {
  position: absolute;
  inset: -6px;
  border-radius: 16px;
  border: 1px solid rgba(94, 234, 212, 0.35);
  animation: pulse 1.35s ease-out infinite;
  opacity: 0.75;
}

@keyframes pulse {
  0% {
    transform: scale(0.92);
    opacity: 0.85;
  }
  100% {
    transform: scale(1.12);
    opacity: 0;
  }
}

.meta .t {
  font-size: 12px;
  letter-spacing: 0.12em;
  color: rgba(232, 240, 255, 0.86);
}

.meta .s {
  margin-top: 2px;
  font-size: 12px;
  color: var(--muted);
}

@media (prefers-reduced-motion: reduce) {
  .meter-fill,
  .step {
    transition: none;
  }
  .pulse {
    animation: none;
    opacity: 0.35;
  }
}
</style>

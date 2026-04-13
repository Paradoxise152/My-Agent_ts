<script setup lang="ts">
import AmbientBackdrop from "@/components/agent/AmbientBackdrop.vue";
import PipelineRail from "@/components/agent/PipelineRail.vue";
import TaskPanel from "@/components/agent/TaskPanel.vue";
import ContextCard from "@/components/agent/ContextCard.vue";
import StreamPanel from "@/components/agent/StreamPanel.vue";
import ToolDeck from "@/components/agent/ToolDeck.vue";
import EventLog from "@/components/agent/EventLog.vue";
import { useAgentSimulation } from "@/composables/useAgentSimulation";

/** 顶层解构：模板才能对 ref / computed 自动解包 */
const { task, running, activeStep, progress, contextSnippet, streamText, toolCalls, logs, liveError, runAgent, runDemo, reset } =
  useAgentSimulation();
</script>

<template>
  <div class="shell">
    <AmbientBackdrop />

    <div class="content">
      <header class="hero">
        <div class="brand">
          <div class="mark" aria-hidden="true">
            <span class="orbit" />
            <span class="core" />
          </div>
          <div>
            <div class="name">Agent Console</div>
            <div class="tag">TypeScript · MCP · RAG · Tool Loop</div>
          </div>
        </div>
        <div class="hero-right">
          <div class="pill">本地可视化</div>
          <div class="pill soft">GPU 友好动效</div>
        </div>
      </header>

      <main class="grid">
        <div class="col-left">
          <TaskPanel
            v-model:task="task"
            :running="running"
            :error-text="liveError"
            @run-live="runAgent"
            @run-demo="runDemo"
            @reset="reset"
          />
          <PipelineRail :active="activeStep" :running="running" :progress="progress" />
          <ContextCard :text="contextSnippet" />
        </div>

        <div class="col-mid">
          <StreamPanel :text="streamText" />
          <ToolDeck :items="toolCalls" />
        </div>

        <div class="col-right">
          <EventLog :items="logs" />
        </div>
      </main>

      <footer class="ft">
        <span>与 `src/Agent.ts` 编排语义对齐：检索上下文 → 初始化工具 → 模型决策 → 工具执行 → 回填循环。</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.shell {
  position: relative;
  height: 100%;
  overflow: auto;
  overscroll-behavior: none;
  background: radial-gradient(1200px 700px at 20% 0%, rgba(56, 189, 248, 0.12), transparent 60%),
    radial-gradient(900px 600px at 90% 20%, rgba(94, 234, 212, 0.1), transparent 55%), var(--bg1);
}

.content {
  position: relative;
  z-index: 1;
  max-width: 1240px;
  margin: 0 auto;
  padding: 22px 18px 18px;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 2px 6px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.mark {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  position: relative;
  border: 1px solid rgba(120, 200, 255, 0.18);
  background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.18));
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
}

.core {
  position: absolute;
  inset: 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(94, 234, 212, 0.95), rgba(56, 189, 248, 0.55));
  filter: saturate(1.1);
}

.orbit {
  position: absolute;
  inset: -6px;
  border-radius: 18px;
  border: 1px dashed rgba(120, 200, 255, 0.22);
  animation: spin 14s linear infinite;
  transform: translateZ(0);
}

.name {
  font-size: 18px;
  letter-spacing: 0.02em;
}

.tag {
  margin-top: 3px;
  font-size: 12px;
  color: var(--muted);
}

.hero-right {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.pill {
  font-size: 11px;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(94, 234, 212, 0.22);
  color: rgba(167, 243, 208, 0.92);
  background: rgba(94, 234, 212, 0.06);
}

.pill.soft {
  border-color: rgba(120, 200, 255, 0.16);
  color: rgba(232, 240, 255, 0.72);
  background: rgba(255, 255, 255, 0.03);
}

.grid {
  display: grid;
  grid-template-columns: 360px 1fr 360px;
  gap: 14px;
  align-items: start;
  flex: 1;
}

.col-left,
.col-mid,
.col-right {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.ft {
  padding: 8px 2px 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .orbit {
    animation: none;
  }
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
const task = defineModel<string>("task", { required: true });

defineProps<{
  running: boolean;
  errorText?: string;
}>();

const emit = defineEmits<{
  runLive: [];
  runDemo: [];
  reset: [];
}>();
</script>

<template>
  <section class="panel" aria-label="任务输入">
    <div class="panel-head">
      <div>
        <div class="kicker">Task</div>
        <div class="h">向 Agent 下达指令</div>
      </div>
      <div class="badges">
        <span class="badge">MCP</span>
        <span class="badge">RAG</span>
        <span class="badge">Tool Loop</span>
      </div>
    </div>

    <label class="sr-only" for="task-input">任务内容</label>
    <textarea
      id="task-input"
      v-model="task"
      class="input"
      rows="5"
      spellcheck="false"
      placeholder="例如：基于 knowledge 检索到的上下文，总结并写入 output/notes.md …"
      :disabled="running"
    />

    <p v-if="errorText" class="err" role="status">{{ errorText }}</p>

    <div class="actions">
      <button type="button" class="btn primary" :disabled="running" @click="emit('runLive')">
        <span class="btn-glow" aria-hidden="true" />
        <span>{{ running ? "执行中…" : "运行 Agent（后端）" }}</span>
      </button>
      <button type="button" class="btn ghost" :disabled="running" @click="emit('runDemo')">离线演示</button>
      <button type="button" class="btn ghost" :disabled="running" @click="emit('reset')">清空</button>
    </div>
    <p class="hint">
      真实运行需先启动 API：<code class="mono">pnpm server:dev</code>（默认 <span class="mono">8787</span>），再用
      <code class="mono">pnpm web:dev</code> 通过 Vite 代理访问 <span class="mono">/api</span>。
    </p>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(12, 18, 40, 0.72), rgba(8, 12, 26, 0.55));
  border-radius: var(--radius);
  padding: 14px;
  backdrop-filter: blur(10px);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.kicker {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(94, 234, 212, 0.75);
}

.h {
  margin-top: 4px;
  font-size: 15px;
  letter-spacing: 0.02em;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.badge {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(120, 200, 255, 0.14);
  color: rgba(232, 240, 255, 0.72);
  background: rgba(255, 255, 255, 0.03);
}

.input {
  width: 100%;
  resize: vertical;
  min-height: 132px;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(120, 200, 255, 0.14);
  background: rgba(0, 0, 0, 0.22);
  color: var(--text);
  line-height: 1.55;
  transition: border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out);
}

.input:focus {
  border-color: rgba(94, 234, 212, 0.35);
  box-shadow: 0 0 0 4px rgba(94, 234, 212, 0.08);
}

.input:disabled {
  opacity: 0.55;
}

.err {
  margin: 10px 2px 0;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid rgba(251, 113, 133, 0.22);
  background: rgba(251, 113, 133, 0.06);
  color: rgba(255, 210, 220, 0.92);
  font-size: 12px;
  line-height: 1.45;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 11px;
  color: rgba(232, 240, 255, 0.78);
}

.btn {
  position: relative;
  border-radius: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(120, 200, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  cursor: pointer;
  transition: transform 180ms var(--ease-spring), border-color 180ms var(--ease-out), background 180ms var(--ease-out);
}

.btn:active:not(:disabled) {
  transform: translateY(1px) scale(0.99);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn.primary {
  border-color: rgba(94, 234, 212, 0.28);
  background: linear-gradient(180deg, rgba(94, 234, 212, 0.18), rgba(56, 189, 248, 0.08));
  overflow: hidden;
}

.btn.primary:not(:disabled):hover {
  border-color: rgba(94, 234, 212, 0.45);
}

.btn-glow {
  position: absolute;
  inset: -40%;
  background: radial-gradient(circle at 30% 30%, rgba(94, 234, 212, 0.35), transparent 55%);
  opacity: 0.55;
  transform: translate3d(0, 0, 0);
  pointer-events: none;
}

.btn.ghost {
  background: transparent;
}

.hint {
  margin: 10px 2px 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.45;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>

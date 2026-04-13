<script setup lang="ts">
/** 纯 CSS 背景：无 Canvas，利于合成层与稳定帧率 */
</script>

<template>
  <div class="backdrop" aria-hidden="true">
    <div class="grid" />
    <div class="orb orb-a" />
    <div class="orb orb-b" />
    <div class="noise" />
  </div>
</template>

<style scoped>
.backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.grid {
  position: absolute;
  inset: -2px;
  opacity: 0.22;
  background-image: linear-gradient(rgba(120, 200, 255, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(120, 200, 255, 0.09) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(closest-side at 50% 35%, #000 0%, transparent 72%);
  transform: translateZ(0);
}

.orb {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  filter: blur(68px);
  opacity: 0.55;
  transform: translate3d(0, 0, 0);
  will-change: transform, opacity;
}

.orb-a {
  left: -160px;
  top: -120px;
  background: radial-gradient(circle at 30% 30%, rgba(94, 234, 212, 0.75), transparent 62%);
  animation: drift-a 18s var(--ease-out) infinite alternate;
}

.orb-b {
  right: -220px;
  bottom: -180px;
  background: radial-gradient(circle at 40% 40%, rgba(56, 189, 248, 0.7), transparent 62%);
  animation: drift-b 22s var(--ease-out) infinite alternate;
}

.noise {
  position: absolute;
  inset: 0;
  opacity: 0.06;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
}

@keyframes drift-a {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 0.45;
  }
  100% {
    transform: translate3d(90px, 60px, 0) scale(1.08);
    opacity: 0.62;
  }
}

@keyframes drift-b {
  0% {
    transform: translate3d(0, 0, 0) scale(1.02);
    opacity: 0.42;
  }
  100% {
    transform: translate3d(-70px, -40px, 0) scale(1.12);
    opacity: 0.58;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orb-a,
  .orb-b {
    animation: none;
    opacity: 0.35;
  }
}
</style>

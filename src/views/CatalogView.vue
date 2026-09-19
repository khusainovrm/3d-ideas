<script setup lang="ts">
import { experiments } from '../config/experiments'
</script>

<template>
  <main class="catalog">
    <header class="catalog__hero">
      <p class="eyebrow">The Odyssey · Visual Research · 2026</p>
      <h1>Beyond the<br /><em>known sea.</em></h1>
      <p class="catalog__intro">
        Независимые WebGL-этюды о пути, масштабе и свете в темноте.
        Каждый опыт — отдельная сцена с мобильным performance budget.
      </p>
    </header>

    <section class="catalog__grid" aria-label="Experiments">
      <article v-for="experiment in experiments" :key="experiment.slug" class="experiment-card">
        <div class="experiment-card__topline">
          <span>{{ experiment.index }}</span>
          <span class="load" :data-load="experiment.load.toLowerCase()">{{ experiment.load }} load</span>
        </div>
        <div>
          <h2>{{ experiment.title }}</h2>
          <p>{{ experiment.description }}</p>
        </div>
        <footer>
          <ul aria-label="Technologies">
            <li v-for="technology in experiment.technologies" :key="technology">{{ technology }}</li>
          </ul>
          <RouterLink :to="`/experiments/${experiment.slug}`" :aria-label="`Открыть ${experiment.title}`">
            Enter <span>↗</span>
          </RouterLink>
        </footer>
      </article>
    </section>

    <footer class="catalog__footer">
      <span>Scroll to navigate</span>
      <span>Built for restraint, not spectacle alone.</span>
    </footer>
  </main>
</template>

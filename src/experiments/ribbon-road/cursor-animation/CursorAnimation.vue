<template>
  <canvas ref="canvas"></canvas>
</template>

<script lang="ts" setup>
import * as THREE from 'three';
import { onMounted, onUnmounted, ref } from 'vue';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CanvasTexture, type Mesh, PerspectiveCamera, Raycaster, Scene, type ShaderMaterial, Vector2 } from 'three';
import particlesVertexShader from './cursor-animation/vertex.glsl';
import particlesFragmentShader from './cursor-animation/fragment.glsl';

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

/**
 * Displacement
 */
const displacement: Partial<{
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  glowImage: HTMLImageElement;
  interactivePlane: Mesh;
  raycaster: Raycaster;
  screenCursor: Vector2;
  canvasCursor: Vector2;
  canvasCursorPrevious: Vector2;
  texture: CanvasTexture;
}> = {};

// 2D Canvas
displacement.canvas = document.createElement('canvas');
displacement.canvas.width = 128;
displacement.canvas.height = 128;
displacement.canvas.style = 'position:fixed;top:0;left:0;width:256px;height:256px;z-index:10';
document.body.append(displacement.canvas);

// Context
displacement.context = displacement.canvas.getContext('2d')!;
displacement.context.fillRect(0, 0, displacement.canvas.width, displacement.canvas.height);

// Glow image
displacement.glowImage = new Image();
displacement.glowImage.src = new URL('@/assets/textures/cursor-animation/glow.png', import.meta.url).href;
displacement.context.drawImage(displacement.glowImage, 20, 20, 32, 32);

// Interactive plane
displacement.interactivePlane = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({ color: 'red', side: THREE.DoubleSide }),
);
displacement.interactivePlane.visible = false;

// Raycaster
displacement.raycaster = new THREE.Raycaster();

// Coordinates
displacement.screenCursor = new THREE.Vector2(9999, 9999);
displacement.canvasCursor = new THREE.Vector2(9999, 9999);
displacement.canvasCursorPrevious = new THREE.Vector2(9999, 9999);

// Texture
displacement.texture = new THREE.CanvasTexture(displacement.canvas);

const canvas = ref<HTMLCanvasElement | null>(null);

let scene: Scene;
let camera: PerspectiveCamera;
let controls: OrbitControls;
let renderer: THREE.WebGLRenderer;
let particlesMaterial: ShaderMaterial;
const clock = new THREE.Clock();

/**
 * Loaders
 */
const textureLoader = new THREE.TextureLoader();

const addObjects = () => {
  /**
   * Particles
   */
  const particlesGeometry = new THREE.PlaneGeometry(10, 10, 128, 128);
  const intecityArray = new Float32Array(particlesGeometry.attributes.position.count);
  const angleArray = new Float32Array(particlesGeometry.attributes.position.count);

  for (let i = 0; i < particlesGeometry.attributes.position.count; i++) {
    intecityArray[i] = Math.random();
    angleArray[i] = Math.random() * Math.PI * 2;
  }
  particlesGeometry.setAttribute('aIntesity', new THREE.BufferAttribute(intecityArray, 1));
  particlesGeometry.setAttribute('aAngle', new THREE.BufferAttribute(angleArray, 1));
  particlesGeometry.setIndex(null);
  particlesGeometry.deleteAttribute('normal');
  particlesMaterial = new THREE.ShaderMaterial({
    vertexShader: particlesVertexShader,
    fragmentShader: particlesFragmentShader,
    uniforms: {
      uResolution: new THREE.Uniform(
        new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio),
      ),
      uPictureTexture: new THREE.Uniform(
        textureLoader.load(new URL('@/assets/textures/cursor-animation/picture-1.png', import.meta.url).href),
      ),
      uDisplacementTexture: new THREE.Uniform(displacement.texture),
    },
  });

  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particles);
};

// Animate and Render
const animate = () => {
  const elapsedTime = clock.getElapsedTime();

  controls.update();

  /**
   * Raycaster
   */
  displacement.raycaster!.setFromCamera(displacement.screenCursor!, camera);

  const intersections = displacement.raycaster!.intersectObject(displacement.interactivePlane!);
  if (intersections.length) {
    const uv = intersections[0].uv!;

    displacement.canvasCursor.x = uv.x * displacement.canvas.width;
    displacement.canvasCursor.y = uv.y * displacement.canvas.height;
  }

  /**
   * Displacement
   */
  // Fade out
  displacement.context!.globalCompositeOperation = 'source-over';
  displacement.context!.globalAlpha = 0.02;
  displacement.context!.fillRect(0, 0, displacement.canvas!.width, displacement.canvas!.height);

  // Speed alpha
  const cursorDistance = displacement.canvasCursorPrevious!.distanceTo(displacement.canvasCursor!);
  displacement.canvasCursorPrevious!.copy(displacement.canvasCursor!);
  const alpha = Math.min(cursorDistance * 0.1, 1);

  // Draw glow
  const glowSize = displacement.canvas!.width * 0.25;
  displacement.context!.globalCompositeOperation = 'lighten';
  displacement.context!.globalAlpha = alpha;
  displacement.context!.drawImage(
    displacement.glowImage!,
    displacement.canvasCursor!.x - glowSize * 0.5,
    displacement.canvasCursor!.y - glowSize * 0.5,
    glowSize,
    glowSize,
  );

  // Texture
  displacement.texture!.needsUpdate = true;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

const init = () => {
  if (canvas.value) {
    const { width, height } = canvas.value.parentElement!.getBoundingClientRect();

    // Update sizes
    sizes.width = width;
    sizes.height = height;

    // Scene
    scene = new THREE.Scene();

    addObjects();

    scene.add(displacement.interactivePlane);

    //Camera
    camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0, 18);
    scene.add(camera);

    /**
     * Renderer
     */
    renderer = new THREE.WebGLRenderer({
      canvas: canvas.value,
      antialias: true,
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(sizes.pixelRatio);
    renderer.setClearColor('#181818');

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    animate();
  }
};

const onResize = () => {
  if (!canvas.value?.parentElement) {
    return;
  }
  const { width, height } = canvas.value.parentElement.getBoundingClientRect();
  // Update sizes
  sizes.width = width;
  sizes.height = height;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Materials
  particlesMaterial.uniforms.uResolution.value.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio);

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(sizes.pixelRatio);
};

onMounted(() => {
  init();
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', (event) => {
    displacement.screenCursor!.x = (event.clientX / sizes.width) * 2 - 1;
    displacement.screenCursor!.y = (event.clientY / sizes.height) * 2 - 1;
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
});
</script>

<style scoped>
canvas {
  flex: 1;
}
</style>

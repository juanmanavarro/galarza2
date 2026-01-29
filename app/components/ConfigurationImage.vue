<script setup>
import { computed } from "vue";

const props = defineProps({
  config: {
    type: Object,
    required: true,
  },
});

const imageMap = {
  default: { src: "/img/AE 2m.webp", alt: "AE 2m" },
  curvaNaranja: { src: "/img/Curva naranja.webp", alt: "Curva naranja" },
  curvaGris: { src: "/img/Curva gris.webp", alt: "Curva gris" },
  rectaInteriorExtremo: { src: "/img/recta-interior-extremo.webp", alt: "Recta interior extremo" },
  ai2m: { src: "/img/AI 2m.webp", alt: "AI 2m" },
  aeE1333: { src: "/img/AE-E 1,333m.webp", alt: "AE-E 1,333m" },
  aiE1333: { src: "/img/AI-E 1,333m.webp", alt: "AI-E 1,333m" },
};

const selectImage = (config) => {
  if (config.type_of_line === "Línea curva" && config.work_environment === "Interior") {
    return imageMap.curvaNaranja;
  }
  if (config.type_of_line === "Línea curva" && config.work_environment === "Exterior") {
    return imageMap.curvaGris;
  }
  if (
    config.type_of_line === "Línea recta" &&
    config.feeding_point_position === "extreme" &&
    config.work_environment === "Interior"
  ) {
    return imageMap.rectaInteriorExtremo;
  }
  if (
    config.type_of_line === "Línea recta" &&
    config.feeding_point_position === "central" &&
    config.work_environment === "Interior" &&
    (config.environmental_condition === "humidity" || config.environmental_condition === "normal")
  ) {
    return imageMap.ai2m;
  }
  if (
    config.type_of_line === "Línea recta" &&
    config.work_environment === "Exterior" &&
    config.feeding_point_position === "central" &&
    config.environmental_condition === "normal"
  ) {
    return imageMap.aeE1333;
  }
  if (
    config.work_environment === "Interior" &&
    config.feeding_point_position === "distance" &&
    config.environmental_condition === "normal"
  ) {
    return imageMap.aiE1333;
  }

  let selected = imageMap.default;

  if (
    config.work_environment === "Exterior" ||
    config.feeding_point_position === "extreme" ||
    config.feeding_point_position === "distance" ||
    (config.environmental_condition === "humidity" && config.feeding_point_position === "extreme") ||
    (Number(config.min_temperature) === -20 &&
      Number(config.max_temperature) === 60 &&
      config.feeding_point_position === "extreme")
  ) {
    selected = imageMap.aeE1333;
  }

  if (
    (config.environmental_condition === "humidity" && config.feeding_point_position === "central") ||
    (Number(config.min_temperature) === -20 &&
      Number(config.max_temperature) === 60 &&
      config.feeding_point_position === "central")
  ) {
    selected = imageMap.aiE1333;
  }

  return selected;
};

const selectedImage = computed(() => selectImage(props.config));
</script>

<template>
  <figure class="rounded-lg bg-base-100 p-3 shadow-sm">
    <img
      class="w-full aspect-video rounded-md object-cover"
      :src="selectedImage.src"
      :alt="selectedImage.alt"
    />
  </figure>
</template>

<script setup>
import { computed } from "vue";
import { useVersionedAsset } from "../../composables/useVersionedAsset";

const props = defineProps({
  config: {
    type: Object,
    required: true,
  },
});
const versionedAsset = useVersionedAsset();

const imageMap = {
  default: { src: versionedAsset("/img/AE 2m.webp"), alt: "AE 2m" },
  curvaNaranja: { src: versionedAsset("/img/Curva naranja.webp"), alt: "Curva naranja" },
  curvaGris: { src: versionedAsset("/img/Curva gris.webp"), alt: "Curva gris" },
  rectaInteriorExtremo: { src: versionedAsset("/img/recta-interior-extremo.webp"), alt: "Recta interior extremo" },
  ai2m: { src: versionedAsset("/img/AI 2m.webp"), alt: "AI 2m" },
  aeE1333: { src: versionedAsset("/img/AE-E 1,333m.webp"), alt: "AE-E 1,333m" },
  aiE1333: { src: versionedAsset("/img/AI-E 1,333m.webp"), alt: "AI-E 1,333m" },
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
    config.work_environment === "Interior"
  ) {
    return imageMap.ai2m;
  }
  if (
    config.type_of_line === "Línea recta" &&
    config.work_environment === "Exterior" &&
    config.feeding_point_position === "central"
  ) {
    return imageMap.aeE1333;
  }
  if (
    config.work_environment === "Interior" &&
    config.feeding_point_position === "distance"
  ) {
    return imageMap.aiE1333;
  }

  let selected = imageMap.default;

  if (
    config.work_environment === "Exterior" ||
    config.feeding_point_position === "extreme" ||
    config.feeding_point_position === "distance" ||
    (Number(config.min_temperature) === -20 &&
      Number(config.max_temperature) === 60 &&
      config.feeding_point_position === "extreme")
  ) {
    selected = imageMap.aeE1333;
  }

  if (
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
  <figure class="rounded-lg bg-base-100 shadow-sm">
    <img
      class="w-full aspect-video rounded-md object-cover"
      :src="selectedImage.src"
      :alt="selectedImage.alt"
    />
  </figure>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { usePowerCalculations } from "../composables/usePowerCalculations";
import { useSendModal } from "../composables/useSendModal";
import { useTotalPower } from "../composables/useTotalPower";
import { useVoltageDrop } from "../composables/useVoltageDrop";
import { useFormValidation } from "../composables/useFormValidation";
import { useSupports } from "../composables/useSupports";
import { useGruaAccessories } from "../composables/useGruaAccessories";
import { useVersionedAsset } from "../composables/useVersionedAsset";
import { useLineCalculations } from "../composables/useLineCalculations";
import {
  TECHNICAL_CONSULTATION_REQUIRED_MESSAGE,
  getLmModelRef,
  requiresTechnicalConsultation,
} from "../utils/lmCatalog";

const STORAGE_KEY = "galarza2-config-state";
const AUTH_STORAGE_KEY = "galarza2-auth-unlocked";
const ACCESS_PASSWORD = "galarz62024";
const currentYear = new Date().getFullYear();
const versionedAsset = useVersionedAsset();

const createInitialFormState = () => ({
  name: "",
  location: "",
  email: "",
  application_industry_type: "",
  number_and_type_of_machines_to_feed: 1,
  type_of_conductors_to_use: "Línea protegida multipolar modular",
  fase: 3,
  ground: 1,
  neutral: 0,
  total_distance: 80,
  type_of_line: "Línea recta",
  tramos: [
    { tramo_recto: null, radio: null, angulo: null, longitud: null },
    { tramo_recto: null, radio: null, angulo: null, longitud: null },
    { tramo_recto: null, radio: null, angulo: null, longitud: null },
    { tramo_recto: null, radio: null, angulo: null, longitud: null },
  ],
  work_environment: "Interior",
  has_mixed_indoor_outdoor_sections: "0",
  feeding_point_position: "extreme",
  feeding_point_position_distance: null,
  has_dust: "0",
  has_corrosive_elements: "0",
  protected_line: "0",
  min_temperature: null,
  max_temperature: null,
  voltage: 380,
  hertz: null,
  max_permissible_voltage_drop: null,
  power_mode: "simultanea",
  max_simultaneous_power_cv: null,
  max_simultaneous_power_kw: null,
  max_simultaneous_power_amp: null,
  max_cv: null,
  max_kw: null,
  max_amp: null,
  intensity_to_install_amp: null,
  supply_support_arms: "0",
  has_sectioned_zones: "0",
  sketch_file: "",
  info: "",
});

const buildGrua = () => ({
  servicios: {
    "Elevación principal": { cv: null, kw: null, amp: null, ed: null },
    "Elevación auxiliar": { cv: null, kw: null, amp: null, ed: null },
    "Traslación grúa": { cv: null, kw: null, amp: null, ed: null },
    "Traslación carro": { cv: null, kw: null, amp: null, ed: null },
    "Otros servicios": { cv: null, kw: null, amp: null, ed: null },
  },
  tomacorrientes: "sin ítem",
  brazo_arrastre: "sin ítem",
});

const getInitialConfigPayload = () => {
  const baseState = createInitialFormState();
  const count = Math.min(4, Math.max(1, Math.floor(Number(baseState.number_and_type_of_machines_to_feed) || 1)));
  return {
    ...baseState,
    gruas: Array.from({ length: count }, () => buildGrua()),
  };
};

const initialSerialized = JSON.stringify(getInitialConfigPayload());

const formState = reactive(createInitialFormState());

const puntoAlimentacion = computed({
  get: () => formState.feeding_point_position,
  set: (value) => {
    formState.feeding_point_position = value;
  },
});
const tipoRecorrido = computed({
  get: () => formState.type_of_line,
  set: (value) => {
    formState.type_of_line = value;
  },
});
const maximaPotenciaTipo = computed({
  get: () => formState.power_mode,
  set: (value) => {
    formState.power_mode = value;
  },
});

const gruas = ref([]);
const isHydrated = ref(false);
const isUnlocked = ref(false);
const accessPassword = ref("");
const accessError = ref("");
const isResetting = ref(false);
const isLineCardOpen = ref(false);
const isFeedingCardOpen = ref(false);
const rightPanelTab = ref("results");
const lastSavedState = ref("");
const initialState = ref(initialSerialized);

const syncGruasLength = () => {
  const count = gruasCount.value;
  const current = gruas.value.length;
  if (count > current) {
    for (let i = current; i < count; i += 1) {
      gruas.value.push(buildGrua());
    }
  } else if (count < current) {
    gruas.value.splice(count);
  }
};

const gruasCount = computed(() => {
  const value = Number(formState.number_and_type_of_machines_to_feed);
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(4, Math.max(1, Math.floor(value)));
});

watch(gruasCount, syncGruasLength, { immediate: true });
const handleFileChange = (event) => {
  const file = event.target?.files?.[0];
  formState.sketch_file = file ? file.name : "";
};

const buildConfigPayload = () => {
  const { name, location, email, ...configState } = formState;
  return {
    ...configState,
    gruas: gruas.value,
  };
};

const getPayloadValue = (value) => hasAnyRightPanelInput.value ? value ?? null : null;

const addMaterial = (materials, { section, reference, quantity, unit = "ud", description }) => {
  if (reference === null || reference === undefined || reference === "") {
    return;
  }
  if (quantity === null || quantity === undefined || quantity === "" || quantity === 0) {
    return;
  }
  materials.push({
    section,
    reference,
    quantity,
    unit,
    description,
  });
};

const addCommonMaterials = (materials, {
  section,
  intensityToInstall,
  supports,
  empalmes,
  alimentacionRef,
  puntoFijo = 1,
  tapaExtrema = 1,
  universalSupports,
}) => {
  const lineReference = getLmModelRef(intensityToInstall, formState.work_environment);
  addMaterial(materials, {
    section,
    reference: lineReference,
    quantity: Number(formState.total_distance),
    unit: "m",
    description: "Línea conductora LM",
  });
  addMaterial(materials, {
    section,
    reference: supportsReferenceLabel.value,
    quantity: supports,
    description: "Soportes",
  });
  addMaterial(materials, {
    section,
    reference: spliceReferenceLabel.value,
    quantity: empalmes,
    description: "Empalmes",
  });
  addMaterial(materials, {
    section,
    reference: alimentacionRef,
    quantity: 1,
    description: "Alimentación extrema",
  });
  addMaterial(materials, {
    section,
    reference: fixedPointReferenceLabel.value,
    quantity: puntoFijo,
    description: "Punto fijo",
  });
  addMaterial(materials, {
    section,
    reference: endCapReferenceLabel.value,
    quantity: tapaExtrema,
    description: "Tapa extrema",
  });
  addMaterial(materials, {
    section,
    reference: universalSupportReferenceLabel.value,
    quantity: universalSupports,
    description: "Soportes universales",
  });
};

const addGruaMaterials = (materials, section, useValues = true) => {
  if (!useValues) {
    return;
  }
  for (let index = 0; index < gruasCount.value; index += 1) {
    addMaterial(materials, {
      section,
      reference: tomacorrientesByGrua.value[index],
      quantity: 1,
      description: `Tomacorrientes grua ${index + 1}`,
    });
    addMaterial(materials, {
      section,
      reference: brazoArrastreByGrua.value[index],
      quantity: 1,
      description: `Brazo arrastre grua ${index + 1}`,
    });
  }
};

const buildCalculatedResultPayload = () => ({
  technicalConsultationRequired: shouldRequireTechnicalConsultation.value,
  totalPowerWatts: getPayloadValue(totalPowerWatts.value),
  totalPowerAmps: getPayloadValue(totalPowerAmps.value),
  intensityToInstallAmp: getPayloadValue(intensityToInstallAmp.value),
  lmModelRef: getPayloadValue(lmModelRef.value),
  voltageDropVolts: getPayloadValue(voltageDropVolts.value),
  voltageDropPercent: getPayloadValue(voltageDropPercent.value),
  voltageDropMessage: voltageDropMessage.value || null,
  lineIncreaseOption: voltageDropMessage.value === "VER OPCIONES 1 Y 2" ? {
    intensityToInstallAmp: intensityToInstallLine.value,
    lmModelRef: lmModelRefLine.value,
    voltageDropVolts: voltageDropVoltsLine.value,
    voltageDropPercent: voltageDropPercentLine.value,
    voltageDropMessage: voltageDropMessageLine.value || null,
  } : null,
  intermediateFeedingOption: voltageDropMessage.value === "VER OPCIONES 1 Y 2" ? {
    recommendedFeedingType: recommendedFeedingType.value,
    selectedLengthMeters: selectedFeedingLengthMeters.value,
    intensityToInstallAmp: intensityToInstallFeeding.value,
    lmModelRef: lmModelRefFeeding.value,
    voltageDropPercent: voltageDropPercentIntermedia.value,
    voltageDropPercentDisplay: voltageDropPercentIntermediaDisplay.value,
  } : null,
});

const buildMaterialsPayload = () => {
  const materials = [];
  if (!hasAnyRightPanelInput.value || shouldRequireTechnicalConsultation.value) {
    return materials;
  }

  if (voltageDropMessage.value !== "VER OPCIONES 1 Y 2") {
    addCommonMaterials(materials, {
      section: "resultado",
      intensityToInstall: intensityToInstallAmp.value,
      supports: supportsSO4.value,
      empalmes: empalmesEMP4.value,
      alimentacionRef: alimentacionExtremaRef.value,
      universalSupports: su5001.value,
    });
    addGruaMaterials(materials, "resultado");
    return materials;
  }

  addCommonMaterials(materials, {
    section: "opcion_incrementar_intensidad_linea",
    intensityToInstall: intensityToInstallLine.value,
    supports: supportsSO4Line.value,
    empalmes: empalmesEMP4Line.value,
    alimentacionRef: alimentacionExtremaLine.value,
    universalSupports: su5001Line.value,
  });
  addGruaMaterials(materials, "opcion_incrementar_intensidad_linea", !isConsultingLine.value);

  addCommonMaterials(materials, {
    section: "opcion_alimentacion_intermedia",
    intensityToInstall: intensityToInstallFeeding.value,
    supports: supportsSO4Intermedia.value,
    empalmes: empalmesEMP4Intermedia.value,
    alimentacionRef: alimentacionInteriorIntermedia.value,
    puntoFijo: puntoFijoPF4Intermedia.value,
    tapaExtrema: tapaExtremaTE4Intermedia.value,
    universalSupports: su5001Intermedia.value,
  });
  addMaterial(materials, {
    section: "opcion_alimentacion_intermedia",
    reference: alimentacionInteriorIntermedia.value,
    quantity: alimentacionUnidadesIntermedia.value,
    description: "Alimentación intermedia",
  });
  addGruaMaterials(materials, "opcion_alimentacion_intermedia");

  return materials;
};

const loadStoredState = () => {
  if (typeof window === "undefined") {
    return;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const { gruas: storedGruas, ...storedForm } = parsed;
    Object.keys(formState).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(storedForm, key)) {
        formState[key] = storedForm[key];
      }
    });

    if (Array.isArray(storedGruas)) {
      gruas.value = storedGruas;
    }

    syncGruasLength();
  } catch (error) {
    return;
  }
};

const saveState = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (isResetting.value) {
    return;
  }

  const payload = buildConfigPayload();
  const serialized = JSON.stringify(payload);
  window.localStorage.setItem(STORAGE_KEY, serialized);
  lastSavedState.value = serialized;
};

const loadAuthState = () => {
  if (typeof window === "undefined") {
    return;
  }
  const unlocked = window.localStorage.getItem(AUTH_STORAGE_KEY);
  isUnlocked.value = unlocked === "true";
};

const handleUnlock = () => {
  accessError.value = "";
  if (accessPassword.value.trim() !== ACCESS_PASSWORD) {
    accessError.value = "Contraseña incorrecta";
    return;
  }
  isUnlocked.value = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
  }
};

onMounted(() => {
  loadAuthState();
  loadStoredState();
  const hydratedState = JSON.stringify(buildConfigPayload());
  lastSavedState.value = hydratedState;
  initialState.value = hydratedState;
  isHydrated.value = true;
});

watch(
  () => ({ ...formState, gruas: gruas.value }),
  () => {
    saveState();
  },
  { deep: true }
);

const isDirty = computed(() => JSON.stringify(buildConfigPayload()) !== initialState.value);

const formattedState = computed(() => JSON.stringify(buildConfigPayload(), null, 2));

const errors = ref({});
const { isRequiredFormComplete, handleInputValidation } = useFormValidation(formState, errors);

const { handleCvInput, handleKwInput, handleAmpInput, handleGroupInput } = usePowerCalculations(formState);

const {
  sendModalRef,
  sendForm,
  sendModalOptions,
  isSending,
  openSendModal,
  closeSendModal,
  handleSendSubmit,
} = useSendModal({
  modalId: "sendModal",
  backdropClasses: "overlay-backdrop fixed inset-0 bg-black/40",
  endpoint: () => {
    if (typeof window === "undefined") {
      return "/mail.php";
    }
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    return isLocal ? "http://localhost:8001/mail.php" : "/mail.php";
  },
  getPayload: () => ({
    config: buildConfigPayload(),
    result: buildCalculatedResultPayload(),
    materials: buildMaterialsPayload(),
  }),
  prefillWhenLocal: true,
  onSuccess: () => {
    showToast("Email enviado correctamente");
    resetFormState();
  },
  onError: () => {
    showToast("No se pudo enviar el email", "error");
  },
});

const toastMessage = ref("");
const isToastVisible = ref(false);
const toastVariant = ref("success");
let toastTimeout = null;

const { totalPowerWatts, totalPowerAmps } = useTotalPower(formState, gruas, gruasCount);
const {
  voltageDropVolts,
  intensityToInstallAmp,
  impedanceOhmPerM,
  voltageDropPercent,
  voltageDropMessage,
} = useVoltageDrop(formState, totalPowerAmps);
watch(voltageDropMessage, (value) => {
  if (value !== "VER OPCIONES 1 Y 2") {
    isLineCardOpen.value = false;
    isFeedingCardOpen.value = false;
  }
});
const {
  intensityToInstallLine,
  isConsultingLine,
  voltageDropVoltsLine,
  voltageDropPercentLine,
  voltageDropPercentL2,
  voltageDropPercentL6,
  recommendedFeedingType,
  selectedFeedingLengthMeters,
  voltageDropPercentIntermedia,
  voltageDropPercentIntermediaDisplay,
  intensityToInstallFeeding,
  supportsSO4Intermedia,
  empalmesEMP4Intermedia,
  alimentacionUnidadesIntermedia,
  alimentacionInteriorIntermedia,
  puntoFijoPF4Intermedia,
  tapaExtremaTE4Intermedia,
  su5001Intermedia,
  voltageDropMessageLine,
  supportsSO4Line,
  empalmesEMP4Line,
  alimentacionExtremaLine,
  su5001Line,
} = useLineCalculations(formState, totalPowerAmps);
const { supportsSO4, empalmesEMP4, alimentacionExtremaRef, su5001 } = useSupports(
  formState,
  intensityToInstallAmp
);
const { tomacorrientesByGrua, brazoArrastreByGrua } = useGruaAccessories(formState, gruas);
const shouldRequireTechnicalConsultation = computed(() =>
  requiresTechnicalConsultation({
    totalDistance: formState.total_distance,
    hasCorrosiveElements: formState.has_corrosive_elements,
    hasMixedIndoorOutdoorSections: formState.has_mixed_indoor_outdoor_sections,
    workEnvironment: formState.work_environment,
    minTemperature: formState.min_temperature,
    maxTemperature: formState.max_temperature,
    amperage: totalPowerAmps.value,
    hasSectionedZones: formState.has_sectioned_zones,
  })
);
const shouldShowRightPanelCalculations = computed(() =>
  tipoRecorrido.value === "Línea recta" &&
  ["Interior", "Exterior"].includes(formState.work_environment)
);
const isExteriorEnvironment = computed(() => formState.work_environment === "Exterior");
const lmModelRef = computed(() =>
  getLmModelRef(intensityToInstallAmp.value, formState.work_environment)
);
const lmModelRefLine = computed(() =>
  getLmModelRef(intensityToInstallLine.value, formState.work_environment)
);
const lmModelRefFeeding = computed(() =>
  getLmModelRef(intensityToInstallFeeding.value, formState.work_environment)
);
const supportsReferenceLabel = computed(() => isExteriorEnvironment.value ? "SO4E" : "SO-4");
const spliceReferenceLabel = computed(() => isExteriorEnvironment.value ? "EMP4E" : "EMP-4");
const fixedPointReferenceLabel = computed(() => isExteriorEnvironment.value ? "PF-4E" : "PF-4");
const endCapReferenceLabel = computed(() => isExteriorEnvironment.value ? "TE-4E" : "TE-4");
const universalSupportReferenceLabel = computed(() =>
  isExteriorEnvironment.value ? "SU-500-1-INOX" : "SU-500-1"
);
const feedingCableOptions = computed(() => {
  const prefix = isExteriorEnvironment.value ? "AG-4E" : "AG-4";
  return [
    `${prefix}-1xM25 (1 cable, orificio de 13-18 mm)`,
    `${prefix}-1xM32 (1 cable, orificio de 18-25 mm)`,
    `${prefix}-1xM40 (1 cable, orificio de 22-32 mm)`,
    `${prefix}-1xM63 (1 cable, orificio de 34-44 mm)`,
    `${prefix}-4xM25 (4 cables, orificio de 13-18 mm)`,
    `${prefix}-4xM32 (4 cables, orificio de 18-25 mm)`,
  ];
});
const hasAnyRightPanelInput = computed(() => {
  const hasGruaPower = gruas.value.some((grua) =>
    Object.values(grua?.servicios ?? {}).some(
      (servicio) => Number(servicio?.kw) > 0 || Number(servicio?.amp) > 0
    )
  );
  const hasMaxPower =
    Number(formState.max_simultaneous_power_kw) > 0 ||
    Number(formState.max_simultaneous_power_cv) > 0 ||
    Number(formState.max_simultaneous_power_amp) > 0;
  return hasGruaPower || hasMaxPower;
});

const showToast = (message, variant = "success") => {
  toastMessage.value = message;
  toastVariant.value = variant;
  isToastVisible.value = true;
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  toastTimeout = setTimeout(() => {
    isToastVisible.value = false;
  }, 3000);
};

const resetFormState = async () => {
  isResetting.value = true;
  Object.assign(formState, createInitialFormState());
  gruas.value = [];
  syncGruasLength();
  errors.value = {};
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  const resetState = JSON.stringify(buildConfigPayload());
  lastSavedState.value = resetState;
  initialState.value = resetState;
  await nextTick();
  isResetting.value = false;
};

const handleReset = async () => {
  if (typeof window !== "undefined") {
    const confirmed = window.confirm("¿Seguro que quieres reiniciar la configuración?");
    if (!confirmed) {
      return;
    }
  }
  await resetFormState();
};

</script>

<template>
  <div v-if="!isUnlocked" class="min-h-screen bg-base-200 flex items-center justify-center px-6" data-theme="light">
    <div class="card w-full max-w-md bg-base-100 shadow-lg">
      <div class="card-body space-y-4">
        <div class="space-y-1">
          <h1 class="text-xl font-semibold text-base-content">Acceso protegido</h1>
          <p class="text-sm text-base-content/70">Introduce la contraseña para continuar.</p>
        </div>
        <div class="space-y-2">
          <label class="label-text text-sm font-semibold" for="accessPassword">Contraseña</label>
          <input
            id="accessPassword"
            type="password"
            class="input input-bordered w-full"
            v-model="accessPassword"
            @keydown.enter="handleUnlock"
          />
          <p v-if="accessError" class="text-xs text-error">{{ accessError }}</p>
        </div>
        <button type="button" class="btn btn-primary w-full" @click="handleUnlock">
          Entrar
        </button>
      </div>
    </div>
  </div>
  <div v-else class="h-screen overflow-hidden bg-base-100 flex flex-col" data-theme="light">
    <header class="navbar bg-base-200 px-6 fixed top-0 inset-x-0 z-50 h-16">
      <div class="relative mx-auto flex w-full max-w-[1500px] items-center">
        <a class="flex items-center gap-3 text-xl font-semibold tracking-wide" href="#">
          <img :src="versionedAsset('/favicon.png')" alt="Logo LM" class="h-11 w-11" />
        </a>
        <span class="absolute inset-x-0 text-center text-xl font-semibold tracking-wide">
          Configurador para líneas conductoras LMss
        </span>
      </div>
    </header>

    <main class="h-[calc(100vh-64px)] w-full overflow-hidden pt-20 pb-2 mx-auto max-w-[1500px]">
      <div v-if="isHydrated" class="flex h-full min-h-0 gap-8">
        <section class="scroll-stable flex-1 min-w-0 h-full min-h-0 overflow-y-auto pl-2 pr-2 md:pl-3">
          <h2 class="card-title">Configuración</h2>
          <form class="w-full space-y-8" @submit.prevent @input="handleInputValidation" @change="handleInputValidation">
            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Tipo de aplicación / industria donde la línea eléctrica va a ser instalada
                <span class="text-error"> *</span>
              </h2>
              <input
                id="tipoAplicacion"
                name="application_industry_type"
                type="text"
                class="input input-bordered w-full"
                placeholder="Industria alimentaria, nave industrial, taller mecánico"
                v-model="formState.application_industry_type"
                required
              />
              <p v-if="errors.application_industry_type" class="text-sm text-error">
                {{ errors.application_industry_type }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Número de máquinas a alimentar
                <span class="text-error"> *</span>
              </h2>
              <input
                id="numeroMaquinas"
                name="number_and_type_of_machines_to_feed"
                type="number"
                min="1"
                max="4"
                step="1"
                class="input input-bordered w-full"
                v-model.number="formState.number_and_type_of_machines_to_feed"
                required
              />
              <p v-if="errors.number_and_type_of_machines_to_feed" class="text-sm text-error">
                {{ errors.number_and_type_of_machines_to_feed }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Tipo de conductores a usar
                <span class="text-error"> *</span>
              </h2>
              <div class="space-y-2">
                <label class="flex items-center gap-3">
                  <input
                    type="radio"
                    name="type_of_conductors_to_use"
                    value="Línea protegida multipolar modular"
                    v-model="formState.type_of_conductors_to_use"
                    class="radio radio-primary"
                    required
                  />
                  <span>Línea protegida multipolar modular</span>
                </label>
                <label class="flex items-center gap-3 opacity-60">
                  <input
                    type="radio"
                    name="type_of_conductors_to_use"
                    value="Línea protegida multipolar con pletina continua"
                    v-model="formState.type_of_conductors_to_use"
                    class="radio"
                    disabled
                  />
                  <span>Línea protegida multipolar con pletina continua</span>
                </label>
                <label class="flex items-center gap-3 opacity-60">
                  <input
                    type="radio"
                    name="type_of_conductors_to_use"
                    value="Línea protegida unipolar"
                    v-model="formState.type_of_conductors_to_use"
                    class="radio"
                    disabled
                  />
                  <span>Línea protegida unipolar</span>
                </label>
                <label class="flex items-center gap-3 opacity-60">
                  <input
                    type="radio"
                    name="type_of_conductors_to_use"
                    value="Raíles cabeza de cobre"
                    v-model="formState.type_of_conductors_to_use"
                    class="radio"
                    disabled
                  />
                  <span>Raíles cabeza de cobre</span>
                </label>
                <p v-if="errors.type_of_conductors_to_use" class="text-sm text-error">
                  {{ errors.type_of_conductors_to_use }}
                </p>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Número de polos requerido
                <span class="text-error"> *</span>
              </h2>
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="space-y-2">
                  <label class="label-text" for="polosFases">
                    Fases
                    <span class="text-error"> *</span>
                  </label>
                  <input
                    id="polosFases"
                    name="fase"
                    type="number"
                    min="1"
                    step="1"
                    class="input input-bordered w-full"
                    readonly
                    v-model.number="formState.fase"
                  />
                </div>
                <div class="space-y-2">
                  <label class="label-text" for="polosTierra">
                    Tierra
                    <span class="text-error"> *</span>
                  </label>
                  <input
                    id="polosTierra"
                    name="ground"
                    type="number"
                    min="1"
                    step="1"
                    class="input input-bordered w-full"
                    readonly
                    v-model.number="formState.ground"
                  />
                </div>
                <div class="space-y-2">
                  <label class="label-text" for="polosNeutro">
                    Neutro
                    <span class="text-error"> *</span>
                  </label>
                  <input
                    id="polosNeutro"
                    name="neutral"
                    type="number"
                    min="0"
                    step="1"
                    class="input input-bordered w-full"
                    readonly
                    v-model.number="formState.neutral"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Recorrido total
                <span class="text-error"> *</span>
              </h2>
              <div class="join w-full">
                <input
                  id="recorridoTotal"
                  name="total_distance"
                  type="number"
                  min="1"
                  step="1"
                  class="input input-bordered join-item w-full"
                  v-model.number="formState.total_distance"
                  required
                />
              </div>
              <p class="text-xs text-base-content/60">metros</p>
              <p v-if="errors.total_distance" class="text-sm text-error">
                {{ errors.total_distance }}
              </p>
              <div class="space-y-3">
                <h2 class="text-base font-semibold">
                  Tipo de recorrido
                  <span class="text-error"> *</span>
                </h2>
                <div class="space-y-2">
                  <label class="flex items-center gap-3">
                    <input
                      v-model="tipoRecorrido"
                      type="radio"
                      name="type_of_line"
                      value="Línea recta"
                      class="radio radio-primary"
                      required
                    />
                    <span>Línea recta</span>
                  </label>
                  <label class="flex items-center gap-3">
                    <input
                      v-model="tipoRecorrido"
                      type="radio"
                      name="type_of_line"
                      value="Línea curva"
                      class="radio radio-primary"
                    />
                    <span>Línea curva</span>
                  </label>
                </div>
                <p v-if="errors.type_of_line" class="text-sm text-error">
                  {{ errors.type_of_line }}
                </p>
              </div>
            </div>

            <div v-if="tipoRecorrido === 'Línea curva'" class="space-y-6">
              <h2 class="text-base font-semibold">Tramos del recorrido (x4)</h2>

              <div class="space-y-6 rounded-md border border-base-300 bg-base-200/40 p-4">
                <div class="space-y-2">
                  <span class="label-text">Tramo recto</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="input input-bordered w-full max-w-md"
                    v-model.number="formState.tramos[0].tramo_recto"
                  />
                  <p class="text-xs text-base-content/60">metros</p>
                </div>
                <div class="grid gap-4 sm:grid-cols-3">
                  <div class="space-y-2">
                    <span class="label-text">Radio</span>
                    <input
                      name="tramos[1][radio]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-bordered w-full"
                      :required="tipoRecorrido === 'Línea curva'"
                      v-model.number="formState.tramos[0].radio"
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                    <p v-if="errors['tramos[1][radio]']" class="text-sm text-error">
                      {{ errors["tramos[1][radio]"] }}
                    </p>
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Ángulo</span>
                    <input
                      name="tramos[1][angulo]"
                      type="number"
                      min="0"
                      max="360"
                      step="0.01"
                      class="input input-bordered w-full"
                      :required="tipoRecorrido === 'Línea curva'"
                      v-model.number="formState.tramos[0].angulo"
                    />
                    <p class="text-xs text-base-content/60">grados</p>
                    <p v-if="errors['tramos[1][angulo]']" class="text-sm text-error">
                      {{ errors["tramos[1][angulo]"] }}
                    </p>
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Longitud de la curva</span>
                    <input
                      name="tramos[1][longitud]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-bordered w-full"
                      :required="tipoRecorrido === 'Línea curva'"
                      v-model.number="formState.tramos[0].longitud"
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                    <p v-if="errors['tramos[1][longitud]']" class="text-sm text-error">
                      {{ errors["tramos[1][longitud]"] }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="space-y-6 rounded-md border border-base-300 bg-base-200/40 p-4">
                <div class="space-y-2">
                  <span class="label-text">Tramo recto</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="input input-bordered w-full max-w-md"
                    v-model.number="formState.tramos[1].tramo_recto"
                  />
                  <p class="text-xs text-base-content/60">metros</p>
                </div>
                <div class="grid gap-4 sm:grid-cols-3">
                  <div class="space-y-2">
                    <span class="label-text">Radio</span>
                    <input
                      name="tramos[2][radio]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-bordered w-full"
                      v-model.number="formState.tramos[1].radio"
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Ángulo</span>
                    <input
                      name="tramos[2][angulo]"
                      type="number"
                      min="0"
                      max="360"
                      step="0.01"
                      class="input input-bordered w-full"
                      v-model.number="formState.tramos[1].angulo"
                    />
                    <p class="text-xs text-base-content/60">grados</p>
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Longitud de la curva</span>
                    <input
                      name="tramos[2][longitud]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-bordered w-full"
                      v-model.number="formState.tramos[1].longitud"
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                  </div>
                </div>
              </div>

              <div class="space-y-6 rounded-md border border-base-300 bg-base-200/40 p-4">
                <div class="space-y-2">
                  <span class="label-text">Tramo recto</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="input input-bordered w-full max-w-md"
                    v-model.number="formState.tramos[2].tramo_recto"
                  />
                  <p class="text-xs text-base-content/60">metros</p>
                </div>
                <div class="grid gap-4 sm:grid-cols-3">
                  <div class="space-y-2">
                    <span class="label-text">Radio</span>
                    <input
                      name="tramos[3][radio]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-bordered w-full"
                      v-model.number="formState.tramos[2].radio"
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Ángulo</span>
                    <input
                      name="tramos[3][angulo]"
                      type="number"
                      min="0"
                      max="360"
                      step="0.01"
                      class="input input-bordered w-full"
                      v-model.number="formState.tramos[2].angulo"
                    />
                    <p class="text-xs text-base-content/60">grados</p>
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Longitud de la curva</span>
                    <input
                      name="tramos[3][longitud]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-bordered w-full"
                      v-model.number="formState.tramos[2].longitud"
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                  </div>
                </div>
              </div>

              <div class="space-y-6 rounded-md border border-base-300 bg-base-200/40 p-4">
                <div class="space-y-2">
                  <span class="label-text">Tramo recto</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    class="input input-bordered w-full max-w-md"
                    v-model.number="formState.tramos[3].tramo_recto"
                  />
                  <p class="text-xs text-base-content/60">metros</p>
                </div>
                <div class="grid gap-4 sm:grid-cols-3">
                  <div class="space-y-2">
                    <span class="label-text">Radio</span>
                    <input
                      name="tramos[4][radio]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-bordered w-full"
                      v-model.number="formState.tramos[3].radio"
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Ángulo</span>
                    <input
                      name="tramos[4][angulo]"
                      type="number"
                      min="0"
                      max="360"
                      step="0.01"
                      class="input input-bordered w-full"
                      v-model.number="formState.tramos[3].angulo"
                    />
                    <p class="text-xs text-base-content/60">grados</p>
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Longitud de la curva</span>
                    <input
                      name="tramos[4][longitud]"
                      type="number"
                      min="0"
                      step="0.01"
                      class="input input-bordered w-full"
                      v-model.number="formState.tramos[3].longitud"
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Ambiente de trabajo
                <span class="text-error"> *</span>
              </h2>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="work_environment"
                  value="Interior"
                  v-model="formState.work_environment"
                  class="radio radio-primary"
                  required
                />
                <span>Interior</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="work_environment"
                  value="Exterior"
                  v-model="formState.work_environment"
                  class="radio radio-primary"
                />
                <span>Exterior</span>
              </label>
              <p v-if="errors.work_environment" class="text-sm text-error">
                {{ errors.work_environment }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Hay tramos interiores y exteriores mezclados
                <span class="text-error"> *</span>
              </h2>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="has_mixed_indoor_outdoor_sections"
                  value="0"
                  v-model="formState.has_mixed_indoor_outdoor_sections"
                  class="radio radio-primary"
                  required
                />
                <span>No</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="has_mixed_indoor_outdoor_sections"
                  value="1"
                  v-model="formState.has_mixed_indoor_outdoor_sections"
                  class="radio radio-primary"
                />
                <span>Sí</span>
              </label>
              <p v-if="errors.has_mixed_indoor_outdoor_sections" class="text-sm text-error">
                {{ errors.has_mixed_indoor_outdoor_sections }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Posición del punto de alimentación
                <span class="text-error"> *</span>
              </h2>
              <label class="flex items-center gap-3">
                <input
                  v-model="puntoAlimentacion"
                  type="radio"
                  name="feeding_point_position"
                  value="extreme"
                  class="radio radio-primary"
                  required
                />
                <span>Extremo</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  v-model="puntoAlimentacion"
                  type="radio"
                  name="feeding_point_position"
                  value="central"
                  class="radio radio-primary"
                />
                <span>Central</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  v-model="puntoAlimentacion"
                  type="radio"
                  name="feeding_point_position"
                  value="distance"
                  class="radio radio-primary"
                />
                <span>A</span>
                <input
                  name="feeding_point_position_distance"
                  type="number"
                  min="0"
                  step="1"
                  class="input input-bordered w-24"
                  :disabled="puntoAlimentacion !== 'distance'"
                  :required="puntoAlimentacion === 'distance'"
                  v-model.number="formState.feeding_point_position_distance"
                />
                <span>metros del extremo</span>
              </label>
              <p v-if="errors.feeding_point_position" class="text-sm text-error">
                {{ errors.feeding_point_position }}
              </p>
              <p v-if="errors.feeding_point_position_distance" class="text-sm text-error">
                {{ errors.feeding_point_position_distance }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Hay polvo
                <span class="text-error"> *</span>
              </h2>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="has_dust"
                  value="0"
                  v-model="formState.has_dust"
                  class="radio radio-primary"
                  required
                />
                <span>No</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="has_dust"
                  value="1"
                  v-model="formState.has_dust"
                  class="radio radio-primary"
                />
                <span>Sí</span>
              </label>
              <p v-if="errors.has_dust" class="text-sm text-error">
                {{ errors.has_dust }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Hay elementos corrosivos
                <span class="text-error"> *</span>
              </h2>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="has_corrosive_elements"
                  value="0"
                  v-model="formState.has_corrosive_elements"
                  class="radio radio-primary"
                  required
                />
                <span>No</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="has_corrosive_elements"
                  value="1"
                  v-model="formState.has_corrosive_elements"
                  class="radio radio-primary"
                />
                <span>Sí</span>
              </label>
              <p v-if="errors.has_corrosive_elements" class="text-sm text-error">
                {{ errors.has_corrosive_elements }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Línea protegida con goma de cierre
                <span class="text-error"> *</span>
              </h2>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="protected_line"
                  value="0"
                  v-model="formState.protected_line"
                  class="radio radio-primary"
                  required
                />
                <span>No</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="protected_line"
                  value="1"
                  v-model="formState.protected_line"
                  class="radio radio-primary"
                />
                <span>Sí</span>
              </label>
              <p v-if="errors.protected_line" class="text-sm text-error">
                {{ errors.protected_line }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Temperatura de trabajo</h2>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <span class="label-text">°C mínimos</span>
                  <input
                    type="number"
                    name="min_temperature"
                    step="0.01"
                    class="input input-bordered w-full"
                    v-model.number="formState.min_temperature"
                  />
                  <p v-if="errors.min_temperature" class="text-sm text-error w-full">
                    {{ errors.min_temperature }}
                  </p>
                </div>
                <div class="space-y-2">
                  <span class="label-text">°C máximos</span>
                  <input
                    type="number"
                    name="max_temperature"
                    step="0.01"
                    class="input input-bordered w-full"
                    v-model.number="formState.max_temperature"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Voltaje</h2>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <span class="label-text">Voltaje</span>
                  <input
                    type="number"
                    name="voltage"
                    min="0"
                    step="0.01"
                    class="input input-bordered w-full"
                    v-model.number="formState.voltage"
                  />
                  <p class="text-xs text-base-content/60">Voltios</p>
                  <p v-if="errors.voltage" class="text-sm text-error w-full">
                    {{ errors.voltage }}
                  </p>
                </div>
                <div class="space-y-2">
                  <span class="label-text">Frecuencia</span>
                  <input
                    type="number"
                    name="hertz"
                    min="0"
                    step="0.01"
                    class="input input-bordered w-full"
                    v-model.number="formState.hertz"
                  />
                  <p class="text-xs text-base-content/60">Herzios</p>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Máxima caída de tensión permitida</h2>
              <div class="space-y-2">
                <input
                  type="number"
                  name="max_permissible_voltage_drop"
                  min="0"
                  step="0.01"
                  class="input input-bordered w-full"
                  v-model.number="formState.max_permissible_voltage_drop"
                />
                <p class="text-xs text-base-content/60">%</p>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Máxima potencia</h2>
              <label class="flex items-center gap-3">
                  <input
                    v-model="maximaPotenciaTipo"
                    type="radio"
                    name="power_mode"
                    value="simultanea"
                    class="radio radio-primary"
                  />
                <span>Simultanea</span>
              </label>
              <label class="flex items-center gap-3">
                  <input
                    v-model="maximaPotenciaTipo"
                    type="radio"
                    name="power_mode"
                    value="por_grua"
                    class="radio radio-primary"
                  />
                <span>Por grúa</span>
              </label>
            </div>

            <div v-if="maximaPotenciaTipo === 'simultanea'" class="space-y-3">
              <h2 class="text-base font-semibold">Máxima potencia por máquina</h2>
              <div class="space-y-3">
                <div class="space-y-2">
                  <span class="label-text">Potencia en caballos</span>
                  <input
                    type="number"
                    name="max_simultaneous_power_cv"
                    min="0"
                    step="0.01"
                    class="input input-bordered w-full"
                    v-model.number="formState.max_simultaneous_power_cv"
                    @input="handleCvInput"
                  />
                  <p class="text-xs text-base-content/60">C.V.</p>
                </div>
                <div class="space-y-2">
                  <span class="label-text">Potencia en kilovatios</span>
                  <input
                    type="number"
                    name="max_simultaneous_power_kw"
                    min="0"
                    step="0.01"
                    class="input input-bordered w-full"
                    v-model.number="formState.max_simultaneous_power_kw"
                    @input="handleKwInput"
                  />
                  <p class="text-xs text-base-content/60">Kw</p>
                </div>
                <div class="space-y-2">
                  <span class="label-text">Intensidad nominal</span>
                  <input
                    type="number"
                    name="max_simultaneous_power_amp"
                    min="0"
                    step="0.01"
                    class="input input-bordered w-full"
                    v-model.number="formState.max_simultaneous_power_amp"
                    @input="handleAmpInput"
                  />
                  <p class="text-xs text-base-content/60">Amp. (nom)</p>
                </div>
              </div>
            </div>

            <div v-else class="space-y-6">
              <div
                v-for="index in gruasCount"
                :key="index"
                class="rounded-md border border-base-300 bg-base-200/40 p-4"
              >
                <h3 class="text-base font-semibold">Grúa {{ index }}</h3>
                <div class="overflow-x-auto">
                  <table class="table w-full">
                    <thead>
                      <tr>
                        <th class="text-left">Servicio</th>
                        <th class="text-left">CV</th>
                        <th class="text-left">Kw</th>
                        <th class="text-left">Amp</th>
                        <th class="text-left">%ED</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Elevación principal</td>
                        <td>
                          <input
                            :name="`main_lift_cv_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Elevación principal'].cv"
                            @input="handleGroupInput(gruas[index - 1].servicios['Elevación principal'], 'cv')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`main_lift_kw_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Elevación principal'].kw"
                            @input="handleGroupInput(gruas[index - 1].servicios['Elevación principal'], 'kw')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`main_lift_amp_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Elevación principal'].amp"
                            @input="handleGroupInput(gruas[index - 1].servicios['Elevación principal'], 'amp')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`main_lift_ed_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Elevación principal'].ed"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Elevación auxiliar</td>
                        <td>
                          <input
                            :name="`auxiliary_lift_cv_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Elevación auxiliar'].cv"
                            @input="handleGroupInput(gruas[index - 1].servicios['Elevación auxiliar'], 'cv')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`auxiliary_lift_kw_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Elevación auxiliar'].kw"
                            @input="handleGroupInput(gruas[index - 1].servicios['Elevación auxiliar'], 'kw')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`auxiliary_lift_amp_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Elevación auxiliar'].amp"
                            @input="handleGroupInput(gruas[index - 1].servicios['Elevación auxiliar'], 'amp')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`auxiliary_lift_ed_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Elevación auxiliar'].ed"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Traslación grúa</td>
                        <td>
                          <input
                            :name="`crane_translation_cv_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Traslación grúa'].cv"
                            @input="handleGroupInput(gruas[index - 1].servicios['Traslación grúa'], 'cv')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`crane_translation_kw_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Traslación grúa'].kw"
                            @input="handleGroupInput(gruas[index - 1].servicios['Traslación grúa'], 'kw')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`crane_translation_amp_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Traslación grúa'].amp"
                            @input="handleGroupInput(gruas[index - 1].servicios['Traslación grúa'], 'amp')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`crane_translation_ed_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Traslación grúa'].ed"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Traslación carro</td>
                        <td>
                          <input
                            :name="`trolley_translation_cv_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Traslación carro'].cv"
                            @input="handleGroupInput(gruas[index - 1].servicios['Traslación carro'], 'cv')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`trolley_translation_kw_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Traslación carro'].kw"
                            @input="handleGroupInput(gruas[index - 1].servicios['Traslación carro'], 'kw')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`trolley_translation_amp_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Traslación carro'].amp"
                            @input="handleGroupInput(gruas[index - 1].servicios['Traslación carro'], 'amp')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`trolley_translation_ed_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Traslación carro'].ed"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Otros servicios</td>
                        <td>
                          <input
                            :name="`other_services_cv_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Otros servicios'].cv"
                            @input="handleGroupInput(gruas[index - 1].servicios['Otros servicios'], 'cv')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`other_services_kw_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Otros servicios'].kw"
                            @input="handleGroupInput(gruas[index - 1].servicios['Otros servicios'], 'kw')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`other_services_amp_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Otros servicios'].amp"
                            @input="handleGroupInput(gruas[index - 1].servicios['Otros servicios'], 'amp')"
                          />
                        </td>
                        <td>
                          <input
                            :name="`other_services_ed_${index}`"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered w-24"
                            v-model.number="gruas[index - 1].servicios['Otros servicios'].ed"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!-- Accesorios en la columna derecha -->
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Suministrar brazos soporte
                <span class="text-error"> *</span>
              </h2>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="supply_support_arms"
                  value="0"
                  v-model="formState.supply_support_arms"
                  class="radio radio-primary"
                  required
                />
                <span>No</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="supply_support_arms"
                  value="1"
                  v-model="formState.supply_support_arms"
                  class="radio radio-primary"
                />
                <span>Sí</span>
              </label>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Hay embudos o zonas seccionadas
                <span class="text-error"> *</span>
              </h2>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="has_sectioned_zones"
                  value="0"
                  v-model="formState.has_sectioned_zones"
                  class="radio radio-primary"
                  required
                />
                <span>No</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="has_sectioned_zones"
                  value="1"
                  v-model="formState.has_sectioned_zones"
                  class="radio radio-primary"
                />
                <span>Sí</span>
              </label>
              <p v-if="errors.has_sectioned_zones" class="text-sm text-error">
                {{ errors.has_sectioned_zones }}
              </p>
              <div class="max-w-sm space-y-2">
                <label class="label-text" for="fileInputLabel">
                  Para líneas con embudos o zonas seccionadas por favor remitir un croquis
                </label>
                <input
                  type="file"
                  name="sketch_file"
                  class="input"
                  id="fileInputLabel"
                  @change="handleFileChange"
                />
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Información adicional que podría ser importante para la selección de la línea
              </h2>
              <div class="space-y-2">
                <span class="label-text">
                  Información adicional que podría ser importante para la selección de la línea
                </span>
                <textarea class="textarea textarea-bordered w-full" rows="4" name="info" v-model="formState.info"></textarea>
              </div>
            </div>
          </form>
        </section>
        <aside class="flex-1 min-w-0 h-full min-h-0 flex flex-col gap-4">
          <div class="tabs tabs-box bg-base-200 self-start">
            <button
              type="button"
              class="tab"
              :class="{ 'tab-active': rightPanelTab === 'results' }"
              @click="rightPanelTab = 'results'"
            >
              Resultados
            </button>
            <button
              type="button"
              class="tab"
              :class="{ 'tab-active': rightPanelTab === 'image' }"
              @click="rightPanelTab = 'image'"
            >
              Imagen
            </button>
          </div>
          <div v-if="rightPanelTab === 'image'" class="scroll-stable flex-1 min-w-0 min-h-0 overflow-y-auto pr-2">
            <div class="overflow-hidden rounded-lg bg-base-200 shadow-sm">
              <section class="card w-full">
                <ConfigurationImage :config="formState" />
              </section>
            </div>
          </div>
          <div
            v-else-if="shouldRequireTechnicalConsultation"
            class="results-panel scroll-stable flex-1 min-w-0 min-h-0 overflow-y-auto pr-2 flex flex-col gap-6"
          >
            <section class="card bg-base-200 shadow-sm w-full">
              <div class="card-body">
                <p class="text-sm font-semibold text-warning">
                  {{ TECHNICAL_CONSULTATION_REQUIRED_MESSAGE }}
                </p>
              </div>
            </section>
          </div>
          <div
            v-else-if="shouldShowRightPanelCalculations"
            class="results-panel scroll-stable flex-1 min-w-0 min-h-0 overflow-y-auto pr-2 flex flex-col gap-6"
          >
            <section class="card bg-base-200 shadow-sm w-full">
              <div class="card-body">
                <div class="results-summary-grid grid gap-4 md:grid-cols-4">
                  <div class="results-summary-item">
                  <label class="label-text text-sm font-semibold" for="totalPowerWatts">
                    Potencia total (watios)
                  </label>
                  <input
                    id="totalPowerWatts"
                    type="number"
                    class="input input-bordered w-full"
                    readonly
                    :value="hasAnyRightPanelInput ? totalPowerWatts : ''"
                  />
                  </div>
                  <div class="results-summary-item">
                  <label class="label-text text-sm font-semibold" for="intensityToInstall">
                    Intensidad a instalar (Amperios)
                  </label>
                  <input
                    id="intensityToInstall"
                    type="text"
                    class="input input-bordered w-full"
                    readonly
                    :value="hasAnyRightPanelInput ? intensityToInstallAmp ?? '' : ''"
                  />
                  </div>
                  <div class="results-summary-item">
                  <label class="label-text text-sm font-semibold" for="lmModelRef">
                    Modelo seleccionado
                  </label>
                  <input
                    id="lmModelRef"
                    type="text"
                    class="input input-bordered w-full"
                    readonly
                    :value="hasAnyRightPanelInput ? lmModelRef ?? '' : ''"
                  />
                  </div>
                  <div class="results-summary-item">
                  <label class="label-text text-sm font-semibold" for="voltageDropPercent">
                    % Caída de tensión
                  </label>
                  <input
                    id="voltageDropPercent"
                    type="number"
                    class="input input-bordered w-full"
                    readonly
                    :value="hasAnyRightPanelInput ? voltageDropPercent ?? '' : ''"
                  />
                  <p v-if="voltageDropMessage" class="text-xs text-base-content/70">
                    {{ voltageDropMessage }}
                  </p>
                  </div>
                </div>
                <div v-if="voltageDropMessage !== 'VER OPCIONES 1 Y 2'" class="mt-2 grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="supportsSO4">
                      Soportes ({{ supportsReferenceLabel }})
                    </label>
                    <input
                      id="supportsSO4"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="hasAnyRightPanelInput ? supportsSO4 ?? '' : ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="empalmesEMP4">
                      Empalmes ({{ spliceReferenceLabel }})
                    </label>
                    <input
                      id="empalmesEMP4"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="hasAnyRightPanelInput ? empalmesEMP4 ?? '' : ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="alimentacionExtremaRef">
                      Alimentación extrema (desde 40 A hasta 140 A)
                    </label>
                    <input
                      id="alimentacionExtremaRef"
                      type="text"
                      class="input input-bordered w-full"
                      readonly
                      :value="hasAnyRightPanelInput ? alimentacionExtremaRef ?? '' : ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="alimentacion160200">
                      Alimentación para 160-200 A
                    </label>
                    <select
                      id="alimentacion160200"
                      class="select select-bordered w-full"
                      :disabled="!hasAnyRightPanelInput"
                    >
                      <option value="-">-</option>
                      <option v-for="option in feedingCableOptions" :key="option" :value="option">
                        {{ option }}
                      </option>
                    </select>
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="puntoFijoPF4">
                      Punto Fijo ({{ fixedPointReferenceLabel }})
                    </label>
                    <input
                      id="puntoFijoPF4"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="hasAnyRightPanelInput ? 1 : ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="tapaExtremaTE4">
                      Tapa Extrema ({{ endCapReferenceLabel }})
                    </label>
                    <input
                      id="tapaExtremaTE4"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="hasAnyRightPanelInput ? 1 : ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="su5001">
                      {{ universalSupportReferenceLabel }}
                    </label>
                    <input
                      id="su5001"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="hasAnyRightPanelInput ? su5001 ?? '' : ''"
                    />
                  </div>
                </div>
                <div class="mt-4 space-y-4">
                  <div v-for="index in gruasCount" :key="`grua-resumen-${index}`" class="grua-summary-item">
                    <span class="label-text text-sm font-semibold">Grua {{ index }}</span>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div class="space-y-2">
                        <span v-if="gruasCount === 1 || index === 1" class="label-text">Tomacorrientes</span>
                        <input
                          type="text"
                          class="input input-bordered w-full"
                          readonly
                          :value="hasAnyRightPanelInput ? tomacorrientesByGrua[index - 1] ?? '' : ''"
                        />
                      </div>
                      <div class="space-y-2">
                        <span v-if="gruasCount === 1 || index === 1" class="label-text">Brazo arrastre</span>
                        <input
                          type="text"
                          class="input input-bordered w-full"
                          readonly
                          :value="hasAnyRightPanelInput ? brazoArrastreByGrua[index - 1] ?? '' : ''"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              <pre
                class="mt-3 hidden flex-1 overflow-y-auto rounded-md bg-base-100 p-3 text-xs text-base-content"
              >
{{ formattedState }}
              </pre>
              </div>
            </section>
            <div v-if="voltageDropMessage === 'VER OPCIONES 1 Y 2'" class="card bg-base-200 shadow-sm w-full">
              <button
                type="button"
                class="card-header flex w-full items-center justify-between px-4 py-4 text-left"
                :aria-expanded="isLineCardOpen"
                @click="isLineCardOpen = !isLineCardOpen"
              >
                <h2 class="card-title text-base">1. Incrementar intensidad de la linea</h2>
                <span class="text-sm">{{ isLineCardOpen ? "Ocultar" : "Mostrar" }}</span>
              </button>
              <div v-show="isLineCardOpen" class="card-body px-4 pb-4 pt-2">
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="intensityToInstallLine">
                      Intensidad (Amperios) a INSTALAR
                    </label>
                    <input
                      id="intensityToInstallLine"
                      type="text"
                      class="input input-bordered w-full"
                      readonly
                      :value="intensityToInstallLine ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="lmModelRefLine">
                      Modelo seleccionado a INSTALAR
                    </label>
                    <input
                      id="lmModelRefLine"
                      type="text"
                      class="input input-bordered w-full"
                      readonly
                      :value="lmModelRefLine ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="voltageDropPercent">
                      % Caída de tensión
                    </label>
                    <input
                      id="voltageDropPercent"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="isConsultingLine ? '' : voltageDropPercentLine ?? ''"
                    />
                    <p v-if="voltageDropMessageLine" class="text-xs text-base-content/70">
                      {{ voltageDropMessageLine }}
                    </p>
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="supportsSO4Line">
                      Soportes ({{ supportsReferenceLabel }})
                    </label>
                    <input
                      id="supportsSO4Line"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="isConsultingLine ? '' : supportsSO4Line ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="empalmesEMP4Line">
                      Empalmes ({{ spliceReferenceLabel }})
                    </label>
                    <input
                      id="empalmesEMP4Line"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="isConsultingLine ? '' : empalmesEMP4Line ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="alimentacionExtremaLine">
                      Alimentación extrema (desde 40 A hasta 140 A)
                    </label>
                    <input
                      id="alimentacionExtremaLine"
                      type="text"
                      class="input input-bordered w-full"
                      readonly
                      :value="isConsultingLine ? '' : alimentacionExtremaLine ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="alimentacion160200Line">
                      Alimentación para 160-200 A
                    </label>
                    <select
                      id="alimentacion160200Line"
                      class="select select-bordered w-full"
                      :value="isConsultingLine ? '' : undefined"
                      :disabled="isConsultingLine"
                    >
                      <option value=""></option>
                      <option v-for="option in feedingCableOptions" :key="option" :value="option">
                        {{ option }}
                      </option>
                    </select>
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="puntoFijoPF4Line">
                      Punto Fijo ({{ fixedPointReferenceLabel }})
                    </label>
                    <input
                      id="puntoFijoPF4Line"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="isConsultingLine ? '' : 1"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="tapaExtremaTE4Line">
                      Tapa Extrema ({{ endCapReferenceLabel }})
                    </label>
                    <input
                      id="tapaExtremaTE4Line"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="isConsultingLine ? '' : 1"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="su5001Line">
                      {{ universalSupportReferenceLabel }}
                    </label>
                    <input
                      id="su5001Line"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="isConsultingLine ? '' : su5001Line ?? ''"
                    />
                  </div>
                </div>
                <div class="mt-4 space-y-4">
                  <div v-for="index in gruasCount" :key="`grua-linea-${index}`" class="grua-summary-item">
                    <span class="label-text text-sm font-semibold">Grua {{ index }}</span>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div class="space-y-2">
                        <span v-if="gruasCount === 1 || index === 1" class="label-text">Tomacorrientes</span>
                        <input
                          type="text"
                          class="input input-bordered w-full"
                          readonly
                          :value="isConsultingLine ? '' : tomacorrientesByGrua[index - 1] ?? ''"
                        />
                      </div>
                      <div class="space-y-2">
                        <span v-if="gruasCount === 1 || index === 1" class="label-text">Brazo arrastre</span>
                        <input
                          type="text"
                          class="input input-bordered w-full"
                          readonly
                          :value="isConsultingLine ? '' : brazoArrastreByGrua[index - 1] ?? ''"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="voltageDropMessage === 'VER OPCIONES 1 Y 2'" class="card bg-base-200 shadow-sm w-full">
              <button
                type="button"
                class="card-header flex w-full items-center justify-between px-4 py-4 text-left"
                :aria-expanded="isFeedingCardOpen"
                @click="isFeedingCardOpen = !isFeedingCardOpen"
              >
                <h2 class="card-title text-base">
                  2. Alimentación intermedia<span v-if="recommendedFeedingType">: {{ recommendedFeedingType }}</span>
                </h2>
                <span class="text-sm">{{ isFeedingCardOpen ? "Ocultar" : "Mostrar" }}</span>
              </button>
              <div v-show="isFeedingCardOpen" class="card-body px-4 pb-4 pt-2">
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="intensityToInstallFeeding">
                      Intensidad (Amperios) a INSTALAR
                    </label>
                    <input
                      id="intensityToInstallFeeding"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="intensityToInstallFeeding ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="lmModelRefFeeding">
                      Modelo seleccionado a INSTALAR
                    </label>
                    <input
                      id="lmModelRefFeeding"
                      type="text"
                      class="input input-bordered w-full"
                      readonly
                      :value="lmModelRefFeeding ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="voltageDropPercentIntermedia">
                      % Caída de tensión
                    </label>
                    <input
                      id="voltageDropPercentIntermedia"
                      type="text"
                      class="input input-bordered w-full"
                      readonly
                      :value="voltageDropPercentIntermediaDisplay"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="supportsSO4Intermedia">
                      Soportes ({{ supportsReferenceLabel }})
                    </label>
                    <input
                      id="supportsSO4Intermedia"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="supportsSO4Intermedia ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="empalmesEMP4Intermedia">
                      Empalmes ({{ spliceReferenceLabel }})
                    </label>
                    <input
                      id="empalmesEMP4Intermedia"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="empalmesEMP4Intermedia ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="alimentacionUnidadesIntermedia">
                      Alimentación (unidades)
                    </label>
                    <input
                      id="alimentacionUnidadesIntermedia"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="alimentacionUnidadesIntermedia ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="alimentacionInteriorIntermedia">
                      Alimentación (desde 40 A hasta 140 A)
                    </label>
                    <input
                      id="alimentacionInteriorIntermedia"
                      type="text"
                      class="input input-bordered w-full"
                      readonly
                      :value="alimentacionInteriorIntermedia ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="alimentacion160200Intermedia">
                      Alimentación para 160-200 A
                    </label>
                    <select id="alimentacion160200Intermedia" class="select select-bordered w-full">
                    <option value=""></option>
                    <option v-for="option in feedingCableOptions" :key="option" :value="option">
                      {{ option }}
                    </option>
                    </select>
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="puntoFijoPF4Intermedia">
                      Punto Fijo ({{ fixedPointReferenceLabel }})
                    </label>
                    <input
                      id="puntoFijoPF4Intermedia"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="puntoFijoPF4Intermedia ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="tapaExtremaTE4Intermedia">
                      Tapa Extrema ({{ endCapReferenceLabel }})
                    </label>
                    <input
                      id="tapaExtremaTE4Intermedia"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="tapaExtremaTE4Intermedia ?? ''"
                    />
                  </div>
                  <div class="space-y-2">
                    <label class="label-text text-sm font-semibold" for="su5001Intermedia">
                      {{ universalSupportReferenceLabel }}
                    </label>
                    <input
                      id="su5001Intermedia"
                      type="number"
                      class="input input-bordered w-full"
                      readonly
                      :value="su5001Intermedia ?? ''"
                    />
                  </div>
                </div>
                <div class="mt-4 space-y-4">
                  <div v-for="index in gruasCount" :key="`grua-intermedia-${index}`" class="grua-summary-item">
                    <span class="label-text text-sm font-semibold">Grua {{ index }}</span>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div class="space-y-2">
                        <span v-if="gruasCount === 1 || index === 1" class="label-text">Tomacorrientes</span>
                        <input
                          type="text"
                          class="input input-bordered w-full"
                          readonly
                          :value="tomacorrientesByGrua[index - 1] ?? ''"
                        />
                      </div>
                      <div class="space-y-2">
                        <span v-if="gruasCount === 1 || index === 1" class="label-text">Brazo arrastre</span>
                        <input
                          type="text"
                          class="input input-bordered w-full"
                          readonly
                          :value="brazoArrastreByGrua[index - 1] ?? ''"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="scroll-stable flex-1 min-w-0 min-h-0 overflow-y-auto pr-2 flex flex-col gap-6">
            <section class="card bg-base-200 shadow-sm w-full">
              <div class="card-body">
                <p class="text-sm text-base-content/70">
                  Por ahora, los cálculos solo están implementados para “Línea recta”.
                </p>
              </div>
            </section>
          </div>
        </aside>
      </div>
      <div v-else class="flex h-full items-center justify-center text-sm text-base-content/60">
        Cargando configuración...
      </div>
    </main>
  </div>
  <footer class="fixed bottom-0 inset-x-0 z-40 border-t border-base-200 bg-base-100/95 backdrop-blur">
    <div class="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-6">
      <span class="text-xs text-base-content/70">INDUSTRIAS GALARZA, S.A. © {{ currentYear }}</span>
      <div class="flex items-center gap-3">
        <div class="relative group">
          <button type="button" class="btn btn-primary" :disabled="!isRequiredFormComplete" @click="openSendModal">
            Enviar
          </button>
          <div
            v-if="!isRequiredFormComplete"
            role="tooltip"
            class="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-xs -translate-x-1/2 rounded bg-base-300 px-3 py-2 text-xs text-base-content shadow opacity-0 transition group-hover:opacity-100"
          >
            Faltan campos obligatorios por definir
          </div>
        </div>
        <button v-if="isDirty" type="button" class="btn btn-error" @click="handleReset">
          Reiniciar
        </button>
      </div>
    </div>
  </footer>
  <div
    id="sendModal"
    ref="sendModalRef"
    class="overlay modal hidden modal-middle [--body-scroll:true] overlay-open:opacity-100 overlay-open:pointer-events-auto"
    role="dialog"
    aria-modal="true"
    aria-labelledby="sendModalTitle"
    :data-overlay-options="sendModalOptions"
    @click.self="closeSendModal"
  >
    <div class="modal-dialog modal-dialog-md">
      <div class="modal-content overlay-animation-target" data-theme="light">
        <div class="modal-header">
          <h3 id="sendModalTitle" class="modal-title">Enviar</h3>
          <button type="button" class="btn btn-sm btn-circle btn-ghost" @click="closeSendModal">
            ✕
          </button>
        </div>
        <div class="modal-body space-y-6">
          <p class="text-base text-base-content/70">
            Se enviará la configuración a Industrias Galarza S.A. Tras el envío, el formulario se reseteará automáticamente.
          </p>
          <div class="space-y-3">
            <label class="label-text text-base font-semibold" for="sendName">
              Nombre
              <span class="text-error"> *</span>
            </label>
            <input
              id="sendName"
              name="send_name"
              type="text"
              class="input input-bordered w-full"
              v-model="sendForm.name"
              required
            />
          </div>
          <div class="space-y-3">
            <label class="label-text text-base font-semibold" for="sendLocation">
              Provincia / País
              <span class="text-error"> *</span>
            </label>
            <input
              id="sendLocation"
              name="send_location"
              type="text"
              class="input input-bordered w-full"
              v-model="sendForm.location"
              required
            />
          </div>
          <div class="space-y-3">
            <label class="label-text text-base font-semibold" for="sendEmail">
              Email
              <span class="text-error"> *</span>
            </label>
            <input
              id="sendEmail"
              name="send_email"
              type="email"
              class="input input-bordered w-full"
              v-model="sendForm.email"
              required
            />
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" @click="closeSendModal">
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="isSending"
              @click="handleSendSubmit"
            >
              {{ isSending ? "Enviando..." : "Enviar" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="fixed bottom-20 right-6 z-[100] flex flex-col gap-2">
    <div
      v-if="isToastVisible"
      class="alert shadow-lg"
      :class="toastVariant === 'error' ? 'alert-error' : 'alert-success'"
    >
      <span class="text-base font-semibold">{{ toastMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.results-panel :is(input.input, select.select) {
  min-height: 2.25rem;
  height: 2.25rem;
  padding-inline: 0.625rem;
  font-size: 0.875rem;
}

.results-panel .label-text {
  margin-bottom: 0;
  font-size: 0.8125rem;
  line-height: 1.2;
}

.results-summary-grid .label-text {
  margin: 0;
}

.results-summary-item {
  display: grid;
  grid-template-rows: minmax(2.75rem, auto) 2.25rem auto;
  align-items: start;
}

.results-panel .space-y-2 > :not([hidden]) ~ :not([hidden]) {
  margin-top: 0;
}

.results-panel .grid {
  row-gap: 0.5rem;
}

.grua-summary-item {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
}

.grua-summary-item > .label-text {
  flex: 0 0 auto;
  min-width: 4rem;
  margin-bottom: 0.375rem;
  text-align: left;
}

.grua-summary-item > .grid {
  flex: 1 1 auto;
}
</style>

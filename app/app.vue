<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { usePowerCalculations } from "../composables/usePowerCalculations";
import { useSendModal } from "../composables/useSendModal";

const STORAGE_KEY = "galarza2-config-state";
const currentYear = new Date().getFullYear();

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
  total_distance: null,
  type_of_line: "Línea recta",
  tramos: [
    { tramo_recto: null, radio: null, angulo: null, longitud: null },
    { tramo_recto: null, radio: null, angulo: null, longitud: null },
    { tramo_recto: null, radio: null, angulo: null, longitud: null },
    { tramo_recto: null, radio: null, angulo: null, longitud: null },
  ],
  work_environment: "",
  feeding_point_position: "",
  feeding_point_position_distance: null,
  environmental_condition: "",
  environmental_condition_corrosive: "",
  protected_line: "",
  min_temperature: null,
  max_temperature: null,
  voltage: null,
  hertz: null,
  max_permissible_voltage_drop: null,
  power_mode: "simultanea",
  max_simultaneous_power_cv: null,
  max_simultaneous_power_kw: null,
  max_simultaneous_power_amp: null,
  max_cv: null,
  max_kw: null,
  max_amp: null,
  supply_support_arms: "0",
  sketch_file: "",
  info: "",
});

const formState = reactive(createInitialFormState());

const puntoAlimentacion = computed({
  get: () => formState.feeding_point_position,
  set: (value) => {
    formState.feeding_point_position = value;
  },
});
const condicionesAmbientales = computed({
  get: () => formState.environmental_condition,
  set: (value) => {
    formState.environmental_condition = value;
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
const isResetting = ref(false);
const lastSavedState = ref("");
const initialState = ref("");
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

onMounted(() => {
  loadStoredState();
  lastSavedState.value = JSON.stringify(buildConfigPayload());
  initialState.value = lastSavedState.value;
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

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isValidNumber = (value, { min = null, max = null } = {}) => {
  if (value === null || value === "" || Number.isNaN(Number(value))) {
    return false;
  }
  const numeric = Number(value);
  if (min !== null && numeric < min) {
    return false;
  }
  if (max !== null && numeric > max) {
    return false;
  }
  return true;
};

const isRequiredFormComplete = computed(() => {
  if (!isNonEmptyString(formState.application_industry_type)) {
    return false;
  }
  if (!isValidNumber(formState.number_and_type_of_machines_to_feed, { min: 1, max: 4 })) {
    return false;
  }
  if (!isNonEmptyString(formState.type_of_conductors_to_use)) {
    return false;
  }
  if (!isValidNumber(formState.total_distance, { min: 1, max: 280 })) {
    return false;
  }
  if (!isNonEmptyString(formState.type_of_line)) {
    return false;
  }
  if (formState.type_of_line === "Línea curva") {
    if (!isValidNumber(formState.tramos[0]?.radio, { min: 0 })) {
      return false;
    }
    if (!isValidNumber(formState.tramos[0]?.angulo, { min: 0, max: 360 })) {
      return false;
    }
    if (!isValidNumber(formState.tramos[0]?.longitud, { min: 0 })) {
      return false;
    }
  }
  if (!isNonEmptyString(formState.work_environment)) {
    return false;
  }
  if (!isNonEmptyString(formState.feeding_point_position)) {
    return false;
  }
  if (
    formState.feeding_point_position === "distance" &&
    !isValidNumber(formState.feeding_point_position_distance, { min: 0 })
  ) {
    return false;
  }
  if (!isNonEmptyString(formState.environmental_condition)) {
    return false;
  }
  if (
    formState.environmental_condition === "corrosive" &&
    !isNonEmptyString(formState.environmental_condition_corrosive)
  ) {
    return false;
  }
  if (!isNonEmptyString(formState.protected_line)) {
    return false;
  }
  if (!isNonEmptyString(formState.supply_support_arms)) {
    return false;
  }
  return true;
});

const { handleCvInput, handleKwInput, handleGroupInput } = usePowerCalculations(formState);

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
  lastSavedState.value = JSON.stringify(buildConfigPayload());
  initialState.value = lastSavedState.value;
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

const getErrorMessage = (target) => {
  const { validity } = target;
  if (validity.valueMissing) {
    return "Este campo es obligatorio.";
  }
  if (validity.rangeUnderflow) {
    return `Valor mínimo: ${target.min}.`;
  }
  if (validity.rangeOverflow) {
    if (target.max === "280") {
      return "Valor máximo: 280. Para más recorrido contacte con el servicio técnico.";
    }
    return `Valor máximo: ${target.max}.`;
  }
  if (validity.stepMismatch || validity.typeMismatch || validity.badInput) {
    return "Formato inválido.";
  }
  return target.validationMessage || "Campo inválido.";
};

const handleInputValidation = (event) => {
  const target = event.target;
  if (!target || !target.name || target.disabled) {
    return;
  }

  if (target.type === "radio") {
    const group = document.querySelectorAll(`input[name="${target.name}"]`);
    const checked = Array.from(group).some((input) => input.checked);
    if (!checked && target.required) {
      errors.value[target.name] = "Selecciona una opción.";
    } else {
      delete errors.value[target.name];
    }
    return;
  }

  if (!target.validity.valid) {
    errors.value[target.name] = getErrorMessage(target);
  } else {
    delete errors.value[target.name];
  }

  if (target.name === "min_temperature" || target.name === "max_temperature") {
    const minTemp = formState.min_temperature;
    const maxTemp = formState.max_temperature;
    if (minTemp !== null && maxTemp !== null && minTemp >= maxTemp) {
      errors.value.min_temperature = "La temperatura mínima debe ser menor que la temperatura máxima.";
    } else {
      delete errors.value.min_temperature;
    }
  }

  if (target.name === "voltage") {
    if (formState.voltage !== null && Number(formState.voltage) > 500) {
      errors.value.voltage = "Para un voltaje mayor a 500V contacte con el servicio técnico.";
    } else {
      delete errors.value.voltage;
    }
  }
};
</script>

<template>
  <div class="h-screen overflow-hidden bg-base-100 flex flex-col" data-theme="light">
    <header class="navbar bg-base-200 px-6 fixed top-0 inset-x-0 z-50 h-16">
      <div class="relative mx-auto flex w-full max-w-[1500px] items-center">
        <a class="flex items-center gap-3 text-xl font-semibold tracking-wide" href="#">
          <img src="/logo.png" alt="Logo LM" class="h-11 w-11" />
        </a>
        <span class="absolute inset-x-0 text-center text-xl font-semibold tracking-wide">
          Configurador para líneas conductoras LM
        </span>
      </div>
    </header>

    <main class="h-[calc(100vh-64px)] overflow-hidden pt-20 pb-2 mx-auto max-w-[1500px]">
      <div v-if="isHydrated" class="flex h-full gap-8">
        <section class="flex-1 h-full overflow-y-auto pr-2">
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
                  max="280"
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
                <p class="label-text">
                  Tipo de recorrido
                  <span class="text-error"> *</span>
                </p>
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
                Condiciones ambientales
                <span class="text-error"> *</span>
              </h2>
              <label class="flex items-center gap-3">
                <input
                  v-model="condicionesAmbientales"
                  type="radio"
                  name="environmental_condition"
                  value="normal"
                  class="radio radio-primary"
                  required
                />
                <span>Normal</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  v-model="condicionesAmbientales"
                  type="radio"
                  name="environmental_condition"
                  value="dust"
                  class="radio radio-primary"
                />
                <span>Polvo</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  v-model="condicionesAmbientales"
                  type="radio"
                  name="environmental_condition"
                  value="humidity"
                  class="radio radio-primary"
                />
                <span>Humedad</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  v-model="condicionesAmbientales"
                  type="radio"
                  name="environmental_condition"
                  value="corrosive"
                  class="radio radio-primary"
                />
                <span>Elementos corrosivos</span>
              </label>
              <textarea
                name="environmental_condition_corrosive"
                class="textarea textarea-bordered w-full"
                rows="4"
                :disabled="condicionesAmbientales !== 'corrosive'"
                :required="condicionesAmbientales === 'corrosive'"
                v-model="formState.environmental_condition_corrosive"
              />
              <p v-if="errors.environmental_condition" class="text-sm text-error">
                {{ errors.environmental_condition }}
              </p>
              <p v-if="errors.environmental_condition_corrosive" class="text-sm text-error">
                {{ errors.environmental_condition_corrosive }}
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
                    readonly
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
                            readonly
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
                            readonly
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
                            readonly
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
                            readonly
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
                            readonly
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
                <div class="mt-4 grid gap-4 sm:grid-cols-2">
                  <div class="space-y-2">
                    <span class="label-text">Tomacorrientes</span>
                    <input
                      type="text"
                      class="input input-bordered w-full"
                      v-model="gruas[index - 1].tomacorrientes"
                    />
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Brazo arrastre</span>
                    <input
                      type="text"
                      class="input input-bordered w-full"
                      v-model="gruas[index - 1].brazo_arrastre"
                    />
                  </div>
                </div>
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
                Para líneas con embudos o zonas seccionadas, remitir un croquis
              </h2>
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
        <aside class="flex-1 h-full overflow-hidden pr-2">
          <div class="card bg-base-200 shadow-sm w-full h-full">
            <div class="card-body flex h-full flex-col">
              <h2 class="card-title">Configuración</h2>
              <ConfigurationImage :config="formState" />
              <pre class="mt-3 flex-1 overflow-y-auto rounded-md bg-base-100 p-3 text-xs text-base-content">
{{ formattedState }}
              </pre>
            </div>
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
        <button type="button" class="btn btn-primary" :disabled="!isRequiredFormComplete" @click="openSendModal">
          Enviar
        </button>
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

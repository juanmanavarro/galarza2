<script setup>
import { computed, ref } from "vue";

const numeroMaquinas = ref(1);
const puntoAlimentacion = ref("extremo");
const condicionesAmbientales = ref("");
const tipoRecorrido = ref("Línea recta");
const maximaPotenciaTipo = ref("simultanea");

const gruasCount = computed(() => {
  const value = Number(numeroMaquinas.value);
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(4, Math.max(1, Math.floor(value)));
});

const errors = ref({});

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
};
</script>

<template>
  <div class="h-screen overflow-hidden bg-base-100 flex flex-col" data-theme="light">
    <header class="navbar bg-base-200 px-6 fixed top-0 inset-x-0 z-50 h-16">
      <div class="flex-1">
        <a class="flex items-center gap-3 text-xl font-semibold tracking-wide" href="#">
          <img src="/logo.png" alt="Logo LM" class="h-9 w-9" />
          <span>Configurador para líneas conductoras LM</span>
        </a>
      </div>
    </header>

    <main class="h-[calc(100vh-64px)] overflow-hidden px-6 pt-20 pb-2 mx-64">
      <div class="flex h-full gap-8">
        <section class="flex-1 h-full overflow-y-auto pr-2">
          <form class="max-w-4xl space-y-8" @input="handleInputValidation" @change="handleInputValidation">
            <div class="space-y-3">
              <h2 class="text-base font-semibold">
                Tipo de aplicación / industria donde la línea eléctrica va a ser instalada
              </h2>
              <input
                id="tipoAplicacion"
                name="application_industry_type"
                type="text"
                class="input input-bordered w-full"
                placeholder="Industria alimentaria, nave industrial, taller mecánico"
                required
              />
              <p v-if="errors.application_industry_type" class="text-sm text-error">
                {{ errors.application_industry_type }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Número de máquinas a alimentar</h2>
              <input
                id="numeroMaquinas"
                name="number_and_type_of_machines_to_feed"
                type="number"
                min="1"
                max="4"
                step="1"
                class="input input-bordered w-full"
                v-model.number="numeroMaquinas"
                required
              />
              <p v-if="errors.number_and_type_of_machines_to_feed" class="text-sm text-error">
                {{ errors.number_and_type_of_machines_to_feed }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Tipo de conductores a usar</h2>
              <div class="space-y-2">
                <label class="flex items-center gap-3">
                  <input
                    type="radio"
                    name="type_of_conductors_to_use"
                    value="Línea protegida multipolar modular"
                    class="radio radio-primary"
                    checked
                    required
                  />
                  <span>Línea protegida multipolar modular</span>
                </label>
                <label class="flex items-center gap-3 opacity-60">
                  <input
                    type="radio"
                    name="type_of_conductors_to_use"
                    value="Línea protegida multipolar con pletina continua"
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
              <h2 class="text-base font-semibold">Número de polos requerido</h2>
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="space-y-2">
                  <label class="label-text" for="polosFases">Fases</label>
                  <input
                    id="polosFases"
                    name="fase"
                    type="number"
                    min="1"
                    step="1"
                    value="3"
                    class="input input-bordered w-full"
                    readonly
                  />
                </div>
                <div class="space-y-2">
                  <label class="label-text" for="polosTierra">Tierra</label>
                  <input
                    id="polosTierra"
                    name="ground"
                    type="number"
                    min="1"
                    step="1"
                    value="1"
                    class="input input-bordered w-full"
                    readonly
                  />
                </div>
                <div class="space-y-2">
                  <label class="label-text" for="polosNeutro">Neutro</label>
                  <input
                    id="polosNeutro"
                    name="neutral"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                    class="input input-bordered w-full"
                    readonly
                  />
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Recorrido total</h2>
              <div class="join w-full">
                <input
                  id="recorridoTotal"
                  name="total_distance"
                  type="number"
                  min="1"
                  max="280"
                  step="1"
                  class="input input-bordered join-item w-full"
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
                  <input type="number" min="0" step="0.01" class="input input-bordered w-full max-w-md" />
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
                  <input type="number" min="0" step="0.01" class="input input-bordered w-full max-w-md" />
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
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                  </div>
                </div>
              </div>

              <div class="space-y-6 rounded-md border border-base-300 bg-base-200/40 p-4">
                <div class="space-y-2">
                  <span class="label-text">Tramo recto</span>
                  <input type="number" min="0" step="0.01" class="input input-bordered w-full max-w-md" />
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
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                  </div>
                </div>
              </div>

              <div class="space-y-6 rounded-md border border-base-300 bg-base-200/40 p-4">
                <div class="space-y-2">
                  <span class="label-text">Tramo recto</span>
                  <input type="number" min="0" step="0.01" class="input input-bordered w-full max-w-md" />
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
                    />
                    <p class="text-xs text-base-content/60">m.</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Ambiente de trabajo</h2>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="work_environment"
                  value="Interior"
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
                  class="radio radio-primary"
                />
                <span>Exterior</span>
              </label>
              <p v-if="errors.work_environment" class="text-sm text-error">
                {{ errors.work_environment }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Posición del punto de alimentación</h2>
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
              <h2 class="text-base font-semibold">Condiciones ambientales</h2>
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
              />
              <p v-if="errors.environmental_condition" class="text-sm text-error">
                {{ errors.environmental_condition }}
              </p>
              <p v-if="errors.environmental_condition_corrosive" class="text-sm text-error">
                {{ errors.environmental_condition_corrosive }}
              </p>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Línea protegida con goma de cierre</h2>
              <label class="flex items-center gap-3">
                <input
                  type="radio"
                  name="protected_line"
                  value="0"
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
                  <input type="number" step="0.01" class="input input-bordered w-full" />
                </div>
                <div class="space-y-2">
                  <span class="label-text">°C máximos</span>
                  <input type="number" step="0.01" class="input input-bordered w-full" />
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Voltaje</h2>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <span class="label-text">Voltaje</span>
                  <input type="number" min="0" step="0.01" class="input input-bordered w-full" />
                  <p class="text-xs text-base-content/60">Voltios</p>
                </div>
                <div class="space-y-2">
                  <span class="label-text">Frecuencia</span>
                  <input type="number" min="0" step="0.01" class="input input-bordered w-full" />
                  <p class="text-xs text-base-content/60">Herzios</p>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Máxima caída de tensión permitida</h2>
              <div class="space-y-2">
                <span class="label-text">Máxima caída de tensión permitida</span>
                <input type="number" min="0" step="0.01" class="input input-bordered w-full" />
                <p class="text-xs text-base-content/60">%</p>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Máxima potencia</h2>
              <label class="flex items-center gap-3">
                <input
                  v-model="maximaPotenciaTipo"
                  type="radio"
                  name="maxima_potencia_tipo"
                  value="simultanea"
                  class="radio radio-primary"
                />
                <span>Simultanea</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  v-model="maximaPotenciaTipo"
                  type="radio"
                  name="maxima_potencia_tipo"
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
                  <input type="number" min="0" step="0.01" class="input input-bordered w-full" />
                  <p class="text-xs text-base-content/60">C.V.</p>
                </div>
                <div class="space-y-2">
                  <span class="label-text">Potencia en kilovatios</span>
                  <input type="number" min="0" step="0.01" class="input input-bordered w-full" />
                  <p class="text-xs text-base-content/60">Kw</p>
                </div>
                <div class="space-y-2">
                  <span class="label-text">Intensidad nominal</span>
                  <input type="number" min="0" step="0.01" class="input input-bordered w-full" />
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
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                      </tr>
                      <tr>
                        <td>Elevación auxiliar</td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                      </tr>
                      <tr>
                        <td>Traslación grúa</td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                      </tr>
                      <tr>
                        <td>Traslación carro</td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                      </tr>
                      <tr>
                        <td>Otros servicios</td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                        <td><input type="number" min="0" step="0.01" class="input input-bordered w-24" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="mt-4 grid gap-4 sm:grid-cols-2">
                  <div class="space-y-2">
                    <span class="label-text">Tomacorrientes</span>
                    <input type="text" class="input input-bordered w-full" value="sin ítem" />
                  </div>
                  <div class="space-y-2">
                    <span class="label-text">Brazo arrastre</span>
                    <input type="text" class="input input-bordered w-full" value="sin ítem" />
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">Suministrar brazos soporte</h2>
              <label class="flex items-center gap-3">
                <input type="radio" name="suministrar_brazos_soporte" class="radio radio-primary" checked required />
                <span>No</span>
              </label>
              <label class="flex items-center gap-3">
                <input type="radio" name="suministrar_brazos_soporte" class="radio radio-primary" />
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
                <input type="file" class="input" id="fileInputLabel" />
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
                <textarea class="textarea textarea-bordered w-full" rows="4"></textarea>
              </div>
            </div>
          </form>
        </section>
        <aside class="w-80 flex-none h-full">
          <div class="card bg-base-200 shadow-sm sticky top-4">
            <div class="card-body">
              <h2 class="card-title">Resumen</h2>
              <p class="text-sm opacity-80">Esta sección permanece visible.</p>
              <button class="btn btn-primary">Continuar</button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

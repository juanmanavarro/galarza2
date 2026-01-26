<script setup>
import { ref } from "vue";

const puntoAlimentacion = ref("extremo");
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

    <main class="h-[calc(100vh-64px)] overflow-hidden px-6 pt-20 pb-2">
      <div class="flex h-full gap-8">
        <section class="flex-1 h-full overflow-y-auto pr-2">
          <form class="max-w-xl space-y-8">
            <div class="space-y-3">
              <h2 class="text-base font-semibold">1. Tipo de aplicación / industria</h2>
              <label class="label-text" for="tipoAplicacion">
                Tipo de aplicación / industria donde la línea eléctrica va a ser instalada
              </label>
              <input
                id="tipoAplicacion"
                type="text"
                class="input input-bordered w-full"
                placeholder="Industria alimentaria, nave industrial, taller mecánico"
                required
              />
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">2. Número de máquinas a alimentar</h2>
              <label class="label-text" for="numeroMaquinas">Número de máquinas a alimentar</label>
              <input
                id="numeroMaquinas"
                type="number"
                min="1"
                step="1"
                class="input input-bordered w-full"
                required
              />
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">3. Tipo de conductores a usar</h2>
              <div class="space-y-2">
                <label class="label-text">Tipo de conductores a usar</label>
                <label class="flex items-center gap-3">
                  <input
                    type="radio"
                    name="tipoConductores"
                    class="radio radio-primary"
                    checked
                  />
                  <span>Línea protegida multipolar modular</span>
                </label>
                <label class="flex items-center gap-3 opacity-60">
                  <input
                    type="radio"
                    name="tipoConductores"
                    class="radio"
                    disabled
                  />
                  <span>Línea protegida multipolar con pletina continua</span>
                </label>
                <label class="flex items-center gap-3 opacity-60">
                  <input type="radio" name="tipoConductores" class="radio" disabled />
                  <span>Línea protegida unipolar</span>
                </label>
                <label class="flex items-center gap-3 opacity-60">
                  <input type="radio" name="tipoConductores" class="radio" disabled />
                  <span>Raíles cabeza de cobre</span>
                </label>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">4. Número de polos requerido</h2>
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="space-y-2">
                  <label class="label-text" for="polosFases">Fases</label>
                  <input
                    id="polosFases"
                    type="number"
                    min="0"
                    step="1"
                    value="3"
                    class="input input-bordered w-full"
                  />
                </div>
                <div class="space-y-2">
                  <label class="label-text" for="polosTierra">Tierra</label>
                  <input
                    id="polosTierra"
                    type="number"
                    min="0"
                    step="1"
                    value="1"
                    class="input input-bordered w-full"
                  />
                </div>
                <div class="space-y-2">
                  <label class="label-text" for="polosNeutro">Neutro</label>
                  <input
                    id="polosNeutro"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                    class="input input-bordered w-full"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">5. Recorrido total</h2>
              <label class="label-text" for="recorridoTotal">Recorrido total</label>
              <div class="join w-full">
                <input
                  id="recorridoTotal"
                  type="number"
                  min="0"
                  step="1"
                  class="input input-bordered join-item w-full"
                  required
                />
                <span class="btn btn-ghost join-item pointer-events-none">metros</span>
              </div>
              <div class="space-y-2">
                <label class="label-text">Tipo de recorrido</label>
                <label class="flex items-center gap-3">
                  <input
                    type="radio"
                    name="tipoRecorrido"
                    class="radio radio-primary"
                    required
                  />
                  <span>Línea recta</span>
                </label>
                <label class="flex items-center gap-3">
                  <input type="radio" name="tipoRecorrido" class="radio radio-primary" />
                  <span>Línea curva</span>
                </label>
              </div>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">6. Ambiente de trabajo</h2>
              <label class="label-text">Ambiente de trabajo</label>
              <label class="flex items-center gap-3">
                <input type="radio" name="ambienteTrabajo" class="radio radio-primary" required />
                <span>Interior</span>
              </label>
              <label class="flex items-center gap-3">
                <input type="radio" name="ambienteTrabajo" class="radio radio-primary" />
                <span>Exterior</span>
              </label>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">7. Posición del punto de alimentación</h2>
              <label class="label-text">Posición del punto de alimentación</label>
              <label class="flex items-center gap-3">
                <input
                  v-model="puntoAlimentacion"
                  type="radio"
                  name="puntoAlimentacion"
                  value="extremo"
                  class="radio radio-primary"
                  required
                />
                <span>Extremo</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  v-model="puntoAlimentacion"
                  type="radio"
                  name="puntoAlimentacion"
                  value="central"
                  class="radio radio-primary"
                />
                <span>Central</span>
              </label>
              <label class="flex items-center gap-3">
                <input
                  v-model="puntoAlimentacion"
                  type="radio"
                  name="puntoAlimentacion"
                  value="distancia"
                  class="radio radio-primary"
                />
                <span>A</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  class="input input-bordered w-24"
                  :disabled="puntoAlimentacion !== 'distancia'"
                />
                <span>metros del extremo</span>
              </label>
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">8. Condiciones ambientales</h2>
              <label class="label-text">Condiciones ambientales</label>
              <label class="flex items-center gap-3">
                <input type="checkbox" class="checkbox checkbox-primary" />
                <span>Normal</span>
              </label>
              <label class="flex items-center gap-3">
                <input type="checkbox" class="checkbox checkbox-primary" />
                <span>Polvo</span>
              </label>
              <label class="flex items-center gap-3">
                <input type="checkbox" class="checkbox checkbox-primary" />
                <span>Humedad</span>
              </label>
              <label class="flex items-center gap-3">
                <input type="checkbox" class="checkbox checkbox-primary" />
                <span>Elementos corrosivos</span>
              </label>
              <textarea
                class="textarea textarea-bordered w-full"
                rows="4"
                placeholder="Descripción de condiciones especiales"
              />
            </div>

            <div class="space-y-3">
              <h2 class="text-base font-semibold">9. Línea protegida con goma de cierre</h2>
              <label class="label-text">Línea protegida con goma de cierre</label>
              <label class="flex items-center gap-3">
                <input type="radio" name="gomaCierre" class="radio radio-primary" required />
                <span>No</span>
              </label>
              <label class="flex items-center gap-3">
                <input type="radio" name="gomaCierre" class="radio radio-primary" />
                <span>Sí</span>
              </label>
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

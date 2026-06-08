export const FORM_VALIDATION_LIMITS = {
  machines: { min: 1, max: 4 },
  totalDistance: { min: 1, max: 280 },
  curveAngle: { min: 0, max: 360 },
  curveDimension: { min: 0 },
  feedingPointDistance: { min: 0 },
  voltageTechnicalConsultation: 500,
} as const;

export const FORM_VALIDATION_MESSAGES = {
  required: "Este campo es obligatorio.",
  invalidFormat: "Formato inválido.",
  selectOption: "Selecciona una opción.",
  maxDistanceTechnicalConsultation: "Valor máximo: 280. Para más recorrido contacte con el servicio técnico.",
  minTemperatureBeforeMax: "La temperatura mínima debe ser menor que la temperatura máxima.",
  voltageTechnicalConsultation: "Para un voltaje mayor a 500V contacte con el servicio técnico.",
} as const;

import { computed } from "vue";
import { FORM_VALIDATION_LIMITS, FORM_VALIDATION_MESSAGES } from "../utils/formValidationRules";

type Tramo = {
  radio: number | null;
  angulo: number | null;
  longitud: number | null;
};

type FormState = {
  application_industry_type: string;
  number_and_type_of_machines_to_feed: number | null;
  type_of_conductors_to_use: string;
  total_distance: number | null;
  type_of_line: string;
  tramos: Tramo[];
  work_environment: string;
  feeding_point_position: string;
  feeding_point_position_distance: number | null;
  environmental_condition: string;
  environmental_condition_corrosive: string;
  protected_line: string;
  supply_support_arms: string;
  min_temperature: number | null;
  max_temperature: number | null;
  voltage: number | null;
};

type ErrorsState = Record<string, string>;

const isNonEmptyString = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const isValidNumber = (value: unknown, { min = null, max = null } = {}) => {
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

const getErrorMessage = (target: HTMLInputElement) => {
  const { validity } = target;
  if (validity.valueMissing) {
    return FORM_VALIDATION_MESSAGES.required;
  }
  if (validity.rangeUnderflow) {
    return `Valor mínimo: ${target.min}.`;
  }
  if (validity.rangeOverflow) {
    if (target.max === "280") {
      return FORM_VALIDATION_MESSAGES.maxDistanceTechnicalConsultation;
    }
    return `Valor máximo: ${target.max}.`;
  }
  if (validity.stepMismatch || validity.typeMismatch || validity.badInput) {
    return FORM_VALIDATION_MESSAGES.invalidFormat;
  }
  return target.validationMessage || "Campo inválido.";
};

export const useFormValidation = (formState: FormState, errors: { value: ErrorsState }) => {
  const isRequiredFormComplete = computed(() => {
    if (!isNonEmptyString(formState.application_industry_type)) {
      return false;
    }
    if (!isValidNumber(formState.number_and_type_of_machines_to_feed, FORM_VALIDATION_LIMITS.machines)) {
      return false;
    }
    if (!isNonEmptyString(formState.type_of_conductors_to_use)) {
      return false;
    }
    if (!isValidNumber(formState.total_distance, FORM_VALIDATION_LIMITS.totalDistance)) {
      return false;
    }
    if (!isNonEmptyString(formState.type_of_line)) {
      return false;
    }
    if (formState.type_of_line === "Línea curva") {
      if (!isValidNumber(formState.tramos[0]?.radio, FORM_VALIDATION_LIMITS.curveDimension)) {
        return false;
      }
      if (!isValidNumber(formState.tramos[0]?.angulo, FORM_VALIDATION_LIMITS.curveAngle)) {
        return false;
      }
      if (!isValidNumber(formState.tramos[0]?.longitud, FORM_VALIDATION_LIMITS.curveDimension)) {
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
      !isValidNumber(formState.feeding_point_position_distance, FORM_VALIDATION_LIMITS.feedingPointDistance)
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

  const handleInputValidation = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target || !target.name || target.disabled) {
      return;
    }

    if (target.type === "radio") {
      const group = document.querySelectorAll(`input[name="${target.name}"]`);
      const checked = Array.from(group).some((input) => (input as HTMLInputElement).checked);
      if (!checked && target.required) {
        errors.value[target.name] = FORM_VALIDATION_MESSAGES.selectOption;
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
        errors.value.min_temperature = FORM_VALIDATION_MESSAGES.minTemperatureBeforeMax;
      } else {
        delete errors.value.min_temperature;
      }
    }

    if (target.name === "voltage") {
      if (
        formState.voltage !== null &&
        Number(formState.voltage) > FORM_VALIDATION_LIMITS.voltageTechnicalConsultation
      ) {
        errors.value.voltage = FORM_VALIDATION_MESSAGES.voltageTechnicalConsultation;
      } else {
        delete errors.value.voltage;
      }
    }
  };

  return {
    isRequiredFormComplete,
    handleInputValidation,
  };
};

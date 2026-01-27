import { onMounted, reactive, ref } from "vue";

export const useSendModal = ({
  modalId = "sendModal",
  backdropClasses = "overlay-backdrop fixed inset-0 bg-black/40",
  endpoint = "/mail.php",
  getPayload = null,
  prefillWhenLocal = false,
  onSuccess = null,
  onError = null,
} = {}) => {
  const sendModalRef = ref(null);
  const isSending = ref(false);
  const sendForm = reactive({
    name: "",
    location: "",
    email: "",
  });
  const sendModalOptions = JSON.stringify({ backdropClasses });

  onMounted(() => {
    if (!prefillWhenLocal || typeof window === "undefined") {
      return;
    }
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (!isLocal) {
      return;
    }
    if (!sendForm.name) {
      sendForm.name = "Test";
    }
    if (!sendForm.location) {
      sendForm.location = "Donostia / ES";
    }
    if (!sendForm.email) {
      sendForm.email = "test@example.com";
    }
  });

  const forceCloseModal = () => {
    if (typeof window === "undefined") {
      return;
    }
    const modal = sendModalRef.value;
    if (modal) {
      modal.classList.remove("open", "opened");
      modal.classList.add("hidden");
      modal.removeAttribute("aria-overlay");
      modal.removeAttribute("tabindex");
    }
    const backdrop = document.getElementById(`${modalId}-backdrop`);
    if (backdrop) {
      backdrop.remove();
    }
    document.body.style.overflow = "";
    document.body.classList.remove("overlay-body-open");
  };

  const closeSendModal = () => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.HSOverlay?.close) {
      window.HSOverlay.close(sendModalRef.value || `#${modalId}`);
    }
    forceCloseModal();
  };

  const openSendModal = () => {
    if (typeof window === "undefined") {
      return;
    }
    const modal = sendModalRef.value;
    if (!modal) {
      return;
    }
    if (window.HSOverlay?.open) {
      window.HSOverlay.open(modal);
      return;
    }
    modal.classList.remove("hidden");
    requestAnimationFrame(() => {
      modal.classList.add("open", "opened");
    });
  };

  const resolveEndpoint = () => {
    if (typeof endpoint === "function") {
      return endpoint();
    }
    return endpoint;
  };

  const handleSendSubmit = async (event) => {
    event.preventDefault();
    if (isSending.value) {
      return;
    }
    isSending.value = true;
    const extraPayload = typeof getPayload === "function" ? getPayload() : {};
    const payload = {
      name: sendForm.name,
      location: sendForm.location,
      email: sendForm.email,
      ...extraPayload,
    };

    try {

      const response = await fetch(resolveEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("No se pudo enviar el formulario.");
      }

      closeSendModal();
      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (error) {
      if (typeof onError === "function") {
        onError(error);
      }
    } finally {
      isSending.value = false;
    }
  };

  return {
    sendModalRef,
    sendForm,
    sendModalOptions,
    isSending,
    openSendModal,
    closeSendModal,
    handleSendSubmit,
  };
};

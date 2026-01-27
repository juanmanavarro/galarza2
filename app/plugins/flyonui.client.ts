export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:mounted", async () => {
    await import("flyonui/dist/overlay.js");
    if (window.HSOverlay?.autoInit) {
      window.HSOverlay.autoInit();
    }
  });
});

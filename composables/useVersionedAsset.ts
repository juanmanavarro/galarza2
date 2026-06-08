export const useVersionedAsset = () => {
  const runtimeConfig = useRuntimeConfig();
  const buildId = runtimeConfig.public.buildId;

  return (path: string) => {
    if (!buildId) {
      return path;
    }

    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}v=${buildId}`;
  };
};

export const formatBytes = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  const kib = size / 1024;

  if (kib < 1024) {
    return `${kib.toFixed(1)} KiB`;
  }

  return `${(kib / 1024).toFixed(1)} MiB`;
};

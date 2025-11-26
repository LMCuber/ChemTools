export function getCSSVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name);
}

export function randHex() {
  let hex = Math.floor(Math.random() * 0xFFFFFF).toString(16);
  return `#${hex.padStart(6, "0")}`;
}

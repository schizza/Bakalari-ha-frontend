export const CARD_VERSION = "0.0.1";

export function createCardHeader(title: string) {
  const h = document.createElement("h3");
  h.textContent = title;
  h.style.margin = "0.5em 0";
  return h;
}

export function registerCard(type: string, name: string, description: string) {
  const w = window as any;
  w.customCards = w.customCards || [];
  if (!w.customCards.some((c: any) => c?.type === type)) {
    w.customCards.push({ type, name, description, preview: false });
  }
}

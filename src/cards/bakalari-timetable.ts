import { createCardHeader } from "./bakalari-base";
import { registerCard } from "./bakalari-base";

class BakalariTimetableCard extends HTMLElement {
  private _config: any;
  setConfig(config: any) {
    this._config = config;
  }
  set hass(_hass: any) {
    this.innerHTML = "";
    this.appendChild(createCardHeader("Bakaláři – rozvrh"));
    const p = document.createElement("p");
    p.textContent = "Zde bude rozvrh.";
    this.appendChild(p);
  }
  getCardSize() {
    return 3;
  }
}
customElements.define("bakalari-timetable-card", BakalariTimetableCard);
registerCard("bakalari-timetable-card", "Bakaláři - rozvrh hodin", "Zobrazení rozvrhu hodin");

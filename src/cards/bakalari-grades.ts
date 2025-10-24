import { createCardHeader } from "./bakalari-base";
import { registerCard } from "./bakalari-base";

class BakalariGradesCard extends HTMLElement {
  private _config: any;
  setConfig(config: any) {
    this._config = config;
  }
  set hass(_hass: any) {
    this.innerHTML = "";
    this.appendChild(createCardHeader("Bakaláři – známky"));
    const p = document.createElement("p");
    p.textContent = "Zde budou data o známkách.";
    this.appendChild(p);
  }
  getCardSize() {
    return 3;
  }
}
customElements.define("bakalari-grades-card", BakalariGradesCard);
registerCard("bakalari-grades-card", "Bakaláři - známky", "Karta pro zobrazení známek");

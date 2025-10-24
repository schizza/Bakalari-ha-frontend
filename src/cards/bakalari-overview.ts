import { createCardHeader } from "./bakalari-base";

class BakalariOverviewCard extends HTMLElement {
  private _config: any;
  setConfig(config: any) { this._config = config; }
  set hass(_hass: any) {
    this.innerHTML = "";
    this.appendChild(createCardHeader("Bakaláři – přehled"));
    const p = document.createElement("p");
    p.textContent = "Souhrnný přehled Bakalářů.";
    this.appendChild(p);
  }
  getCardSize() { return 3; }
}
customElements.define("bakalari-overview-card", BakalariOverviewCard);

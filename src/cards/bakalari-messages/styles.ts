import { css } from "lit";

/**
 * Styles for Bakaláři – Zprávy card
 * ---------------------------------
 * Keep these styles in sync with the structure in `bakalari-messages.ts`.
 */
export default css`
  :host {
    display: block;
  }

  ha-card {
    display: block;
  }

  /* Header controls */
  .tools {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    padding: 12px 16px 0 16px;
  }

  .switch {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: var(--secondary-text-color);
    user-select: none;
  }

  .search {
    min-width: 200px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    border-radius: 8px;
    padding: 6px 8px;
    outline: none;
  }

  .search:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 25%, transparent);
  }

  /* Body wrapper */
  .wrap {
    padding: 0 16px 12px 16px;
  }

  /* List + items */
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item {
    border: 1px solid var(--divider-color);
    border-radius: 12px;
    overflow: hidden;
    background: var(--card-background-color);
  }

  .row {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    cursor: pointer;
    user-select: none;
  }

  .bullet {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-color);
    opacity: 0.6;
    flex: 0 0 auto;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .titleline {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subline {
    color: var(--secondary-text-color);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .icon-sig {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-text-color);
  }

  .icon-sig svg,
  .icon-sig .spinner {
    width: 100%;
    height: 100%;
    display: block;
  }

  .date {
    color: var(--secondary-text-color);
    font-size: 0.85rem;
    flex: 0 0 auto;
  }

  .body {
    padding: 0 12px 12px 12px;
    display: none;
    -webkit-user-select: text;
    user-select: text;
  }

  .item.open .body {
    display: block;
  }

  /* Attachments */
  .attachments {
    margin-top: 6px;
  }

  .attachments a {
    text-decoration: none;
    color: var(--primary-text-color);
  }

  .attachments a:hover {
    text-decoration: underline;
  }

  /* Misc */
  .empty {
    color: var(--secondary-text-color);
    padding: 8px 0;
  }

  .unreadOff .bullet {
    display: none;
  }

  .tag {
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 999px;
    border: 1px solid var(--divider-color);
    color: var(--secondary-text-color);
  }

  .error {
    color: var(--error-color, #c62828);
    padding: 0 16px 12px;
  }

  /* Loading state on row + spinner alignment */
  .row.loading {
    cursor: progress;
  }
  .row.loading .icon-sig {
    pointer-events: none;
    opacity: 0.8;
  }
  .icon-sig ha-circular-progress {
    width: 24px;
    height: 24px;
    --mdc-theme-primary: var(--primary-color);
  }
`;

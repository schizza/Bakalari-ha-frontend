import { css } from "lit";

/**
 * Styles for Bakaláři – Všechny známky card.
 * Extracted into a separate module. Includes color classes for grade buckets.
 */
export const styles = css`
  :host {
    display: block;
  }
  ha-card {
    overflow: hidden;
  }

  .wrap {
    padding: 12px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .btn {
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
  }
  .btn:hover {
    background: color-mix(in oklab, var(--primary-color) 6%, var(--card-background-color));
  }
  .switch {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.95rem;
    color: var(--secondary-text-color);
    user-select: none;
    margin-left: auto;
  }

  /* Summary */
  .summary {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px 14px;
    align-items: center;
  }
  .icon {
    color: var(--secondary-text-color);
  }
  .summary-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 0.9rem;
    line-height: 1;
  }
  .chip .label {
    color: var(--secondary-text-color);
    font-size: 0.85rem;
  }
  .chip.attn {
    border-color: var(--accent-color);
    background: color-mix(in oklab, var(--accent-color) 14%, transparent);
  }

  /* Subjects grid */
  .subjects {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .subjects h4 {
    margin: 0;
    font-size: 1rem;
    color: var(--primary-text-color);
    font-weight: 600;
  }
  .grid {
    --min: 260px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(var(--min), 1fr));
    gap: 10px;
  }
  .subj {
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    border-radius: 12px;
    padding: 10px 12px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "icon name meta"
      "last last last"
      "marks marks marks";
    column-gap: 10px;
    row-gap: 8px;
    align-items: center;
    min-width: 0;
    cursor: pointer;
    transition: background 120ms ease;
  }
  .subj:hover {
    background: color-mix(in oklab, var(--primary-color) 4%, var(--card-background-color));
  }
  .sicon {
    grid-area: icon;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid var(--divider-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: var(--primary-text-color);
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    letter-spacing: 0.4px;
  }
  .name {
    grid-area: name;
    min-width: 0;
  }
  .name .title {
    font-weight: 700;
    color: var(--primary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name .sub {
    color: var(--secondary-text-color);
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    grid-area: meta;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
  .kpi {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 999px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    font-size: 0.85rem;
    line-height: 1;
  }
  .caret {
    margin-left: 8px;
    font-size: 0.95rem;
    color: var(--secondary-text-color);
  }

  /* Base mark style (used in multiple places) */
  .mark {
    font-weight: 800;
    min-width: 1.6em;
    text-align: center;
    padding: 2px 8px;
    border-radius: 10px;
    border: 1px solid var(--divider-color);
    background: var(--secondary-background-color, rgba(0, 0, 0, 0.05));
    color: var(--primary-text-color);
    letter-spacing: 0.3px;
  }

  /* Color classes for grades (rounded buckets) */
  .mark.grade-1 {
    background: color-mix(in oklab, #2e7d32 20%, transparent);
    border-color: #2e7d3240;
  }
  .mark.grade-2 {
    background: color-mix(in oklab, #558b2f 20%, transparent);
    border-color: #558b2f40;
  }
  .mark.grade-3 {
    background: color-mix(in oklab, #f9a825 20%, transparent);
    border-color: #f9a82540;
  }
  .mark.grade-4 {
    background: color-mix(in oklab, #ef6c00 20%, transparent);
    border-color: #ef6c0040;
  }
  .mark.grade-5 {
    background: color-mix(in oklab, #c62828 20%, transparent);
    border-color: #c6282840;
  }

  .last {
    grid-area: last;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    color: var(--secondary-text-color);
    font-size: 0.9rem;
  }
  .last .caption {
    font-size: 0.75rem;
    padding: 2px 6px;
    border-radius: 999px;
    border: 1px solid var(--divider-color);
    color: var(--secondary-text-color);
    background: var(--card-background-color);
  }
  .last .theme {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--primary-text-color);
  }
  .last .date {
    margin-left: auto;
  }
  .marks {
    grid-area: marks;
    display: none;
    border-top: 1px dashed var(--divider-color);
    padding-top: 8px;
  }
  .subj.open .marks {
    display: block;
  }
  .mlist {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .mrow {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "m mtitle mdate"
      "m mtheme mdate";
    gap: 4px 10px;
    align-items: center;
    padding: 4px 0;
    border-radius: 8px;
  }
  .mrow .m {
    grid-area: m;
    min-width: 40px;
    text-align: center;
  }
  .mrow .mtitle {
    grid-area: mtitle;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 600;
    color: var(--primary-text-color);
  }
  .mrow .mtheme {
    grid-area: mtheme;
    color: var(--secondary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 0.92rem;
  }
  .mrow .mdate {
    grid-area: mdate;
    color: var(--secondary-text-color);
    font-size: 0.9rem;
    text-align: right;
    white-space: nowrap;
    margin-left: 8px;
  }
  .badge {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 999px;
    border: 1px solid var(--divider-color);
    color: var(--secondary-text-color);
    background: var(--card-background-color);
  }

  /* Recent */
  .recent {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .recent h4 {
    margin: 0;
    font-size: 1rem;
    color: var(--primary-text-color);
    font-weight: 600;
  }
  .item {
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    border-radius: 12px;
    padding: 10px 12px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      "mark title date"
      "mark theme date";
    column-gap: 10px;
    row-gap: 4px;
    align-items: center;
    min-width: 0;
  }
  .item .mark {
    grid-area: mark;
    min-width: 44px;
    font-size: 1.1rem;
  }
  .item .title {
    grid-area: title;
    font-weight: 700;
    color: var(--primary-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item .theme {
    grid-area: theme;
    color: var(--secondary-text-color);
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .item .date {
    grid-area: date;
    color: var(--secondary-text-color);
    font-size: 0.9rem;
    text-align: right;
    white-space: nowrap;
    margin-left: 8px;
  }
  .empty,
  .error {
    color: var(--secondary-text-color);
    font-size: 0.95rem;
  }
  .error {
    color: var(--error-color, #c62828);
  }
`;

export default styles;

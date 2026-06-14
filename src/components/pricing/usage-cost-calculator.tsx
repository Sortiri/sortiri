"use client";

import Link from "next/link";
import { useState } from "react";
import { landing } from "@/components/landing/typography";
import { inter } from "@/lib/inter";
import {
  USAGE_COST_TABS,
  type UsageCostTabId,
} from "@/config/usage-cost-calculator";

export function UsageCostCalculator() {
  const [activeTab, setActiveTab] = useState<UsageCostTabId>("cpu");
  const tab = USAGE_COST_TABS.find((item) => item.id === activeTab) ?? USAGE_COST_TABS[0];

  return (
    <section
      id="usage-calculator"
      className="usage-calculator"
      aria-labelledby="usage-calculator-title"
    >
      <div className="usage-calculator__frame">
        <span className="usage-calculator__glyph usage-calculator__glyph--tl" aria-hidden>
          +
        </span>
        <span className="usage-calculator__glyph usage-calculator__glyph--tr" aria-hidden>
          +
        </span>
        <span className="usage-calculator__glyph usage-calculator__glyph--ml" aria-hidden>
          −
        </span>
        <span className="usage-calculator__glyph usage-calculator__glyph--mr" aria-hidden>
          −
        </span>
        <span className="usage-calculator__glyph usage-calculator__glyph--bl" aria-hidden>
          =
        </span>
        <span className="usage-calculator__glyph usage-calculator__glyph--br" aria-hidden>
          =
        </span>

        <header className="usage-calculator__header">
          <h2
            id="usage-calculator-title"
            className={`${landing.displayLine} usage-calculator__title`}
          >
            Usage cost calculator
          </h2>
          <p className={`${inter.className} usage-calculator__lead`}>
            We charge per second of a running sandbox. See a detailed breakdown
            below.
          </p>
          <a href="#usage-calculator-table" className="usage-calculator__jump">
            Calculate your costs
          </a>
        </header>

        <div className="usage-calculator__panel" id="usage-calculator-table">
          <div
            className="usage-calculator__tabs"
            role="tablist"
            aria-label="Usage cost categories"
          >
            {USAGE_COST_TABS.map((item) => {
              const selected = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`usage-tab-${item.id}`}
                  aria-selected={selected}
                  aria-controls={`usage-panel-${item.id}`}
                  className="usage-calculator__tab"
                  data-active={selected || undefined}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`usage-panel-${tab.id}`}
            aria-labelledby={`usage-tab-${tab.id}`}
            className="usage-calculator__table-wrap"
          >
            <table className="usage-calculator__table">
              <thead>
                <tr>
                  <th scope="col">{tab.resourceColumn}</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Costs</th>
                </tr>
              </thead>
              <tbody>
                {tab.rows.map((row) => (
                  <tr key={`${tab.id}-${row.resource}`}>
                    <td>
                      <span
                        className={
                          row.isDefault
                            ? "usage-calculator__resource usage-calculator__resource--default"
                            : "usage-calculator__resource"
                        }
                      >
                        {row.resource}
                        {row.isDefault ? (
                          <span className="usage-calculator__default-tag">
                            {" "}
                            [Default]
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td>{row.plan}</td>
                    <td>{row.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="usage-calculator__note">
            <Link href="#">Let us know</Link> if you need more powerful compute.
          </p>
        </div>
      </div>
    </section>
  );
}

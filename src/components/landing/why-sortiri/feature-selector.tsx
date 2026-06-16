"use client";

import { PixelIcon } from "@/components/ui/pixel-icon";
import { inter } from "@/lib/inter";
import {
  WHY_FEATURES,
  type WhyFeature,
  type WhyFeatureId,
} from "@/components/landing/why-sortiri/features";

const BODY = inter.className;

type FeatureSelectorProps = {
  selectedId: WhyFeatureId;
  onSelect: (id: WhyFeatureId) => void;
};

function FeatureButton({
  feature,
  isActive,
  onSelect,
}: {
  feature: WhyFeature;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="why-sortiri__feature-item">
      <button
        type="button"
        role="tab"
        id={`why-feature-tab-${feature.id}`}
        aria-selected={isActive}
        aria-controls={`why-feature-panel-${feature.id}`}
        onClick={onSelect}
        className={`why-sortiri__feature-btn${isActive ? " why-sortiri__feature-btn--active" : ""}`}
      >
        <PixelIcon
          icon={feature.icon}
          size={20}
          className={
            isActive
              ? "why-sortiri__feature-icon why-sortiri__feature-icon--active"
              : "why-sortiri__feature-icon"
          }
        />
        <span className={`${BODY} why-sortiri__feature-label`}>{feature.label}</span>
      </button>

      {isActive ? (
        <p className={`${BODY} why-sortiri__feature-description`}>
          {feature.description}
        </p>
      ) : null}
    </div>
  );
}

export function FeatureSelector({ selectedId, onSelect }: FeatureSelectorProps) {
  return (
    <div
      className="why-sortiri__selector"
      role="tablist"
      aria-label="Why Sortiri features"
    >
      <div className="why-sortiri__features-desktop">
        {WHY_FEATURES.map((feature) => (
          <FeatureButton
            key={feature.id}
            feature={feature}
            isActive={selectedId === feature.id}
            onSelect={() => onSelect(feature.id)}
          />
        ))}
      </div>

      <div className="why-sortiri__features-mobile">
        {WHY_FEATURES.map((feature) => (
          <FeatureButton
            key={feature.id}
            feature={feature}
            isActive={selectedId === feature.id}
            onSelect={() => onSelect(feature.id)}
          />
        ))}
      </div>
    </div>
  );
}

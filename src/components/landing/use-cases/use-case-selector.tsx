"use client";

import { PixelIcon } from "@/components/ui/pixel-icon";
import { inter } from "@/lib/inter";
import {
  USE_CASES,
  type UseCase,
  type UseCaseId,
} from "@/components/landing/use-cases/use-cases";

const BODY = inter.className;

type UseCaseSelectorProps = {
  selectedId: UseCaseId;
  onSelect: (id: UseCaseId) => void;
};

function UseCaseButton({
  useCase,
  isActive,
  onSelect,
}: {
  useCase: UseCase;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="use-cases__item">
      <button
        type="button"
        role="tab"
        id={`use-case-tab-${useCase.id}`}
        aria-selected={isActive}
        aria-controls={`use-case-panel-${useCase.id}`}
        onClick={onSelect}
        className={`use-cases__btn${isActive ? " use-cases__btn--active" : ""}`}
      >
        <PixelIcon
          icon={useCase.icon}
          size={20}
          className={
            isActive
              ? "use-cases__icon use-cases__icon--active"
              : "use-cases__icon"
          }
        />
        <span className={`${BODY} use-cases__label`}>{useCase.label}</span>
      </button>

      {isActive ? (
        <p className={`${BODY} use-cases__description`}>{useCase.description}</p>
      ) : null}
    </div>
  );
}

export function UseCaseSelector({ selectedId, onSelect }: UseCaseSelectorProps) {
  return (
    <div
      className="use-cases__selector"
      role="tablist"
      aria-label="Sortiri use cases"
    >
      <div className="use-cases__list-desktop">
        {USE_CASES.map((useCase) => (
          <UseCaseButton
            key={useCase.id}
            useCase={useCase}
            isActive={selectedId === useCase.id}
            onSelect={() => onSelect(useCase.id)}
          />
        ))}
      </div>

      <div className="use-cases__list-mobile">
        {USE_CASES.map((useCase) => (
          <UseCaseButton
            key={useCase.id}
            useCase={useCase}
            isActive={selectedId === useCase.id}
            onSelect={() => onSelect(useCase.id)}
          />
        ))}
      </div>
    </div>
  );
}

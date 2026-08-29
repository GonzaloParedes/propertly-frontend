interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

// Indicador de progreso para formularios tipo carousel/wizard: barra
// segmentada (una franja por paso) que se rellena a medida que avanzás,
// sin números ni círculos — estilo Typeform/Linear. Puramente
// presentacional, no conoce validación ni campos.
export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between" aria-live="polite">
        <span className="font-heading text-[18px] font-bold">{steps[currentStep]}</span>
        <span className="text-[13.5px] font-bold" style={{ color: "var(--text-2)" }}>
          Paso {currentStep + 1} de {steps.length}
        </span>
      </div>
      <div className="flex gap-2" aria-hidden="true">
        {steps.map((label, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div key={label} className="h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
              {(isCompleted || isActive) && (
                <div
                  className={`h-full rounded-full ${isActive ? "animate-step-fill" : ""}`}
                  style={{ width: isCompleted ? "100%" : undefined, background: "var(--primary)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { component$ } from "@builder.io/qwik";

export interface WizardStepsProps {
  current: 1 | 2 | 3;
}

const STEPS = ["Account", "Profile", "Review"];

export const WizardSteps = component$<WizardStepsProps>(({ current }) => {
  return (
    <div class="wizard-steps">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const state =
          stepNumber === current
            ? "active"
            : stepNumber < current
              ? "done"
              : "";
        return (
          <div key={label} class={`wizard-step ${state}`}>
            {stepNumber}. {label}
          </div>
        );
      })}
    </div>
  );
});

/**
 * Executable step function for Condition action
 */
import "server-only";

import { type StepContext, withStepLogging } from "./step-handler";

export type ConditionInput = {
  condition: boolean;
  _context?: StepContext;
};

// biome-ignore lint/suspicious/useAwait: workflow "use step" requires async
export async function conditionStep(input: ConditionInput): Promise<{
  condition: boolean;
}> {
  "use step";

  return withStepLogging(input._context, input, () =>
    Promise.resolve({ condition: input.condition })
  );
}

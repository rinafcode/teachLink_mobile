/**
 * PrivacyBudgetManager tracks cumulative epsilon consumption and enforces
 * a total privacy budget across analytics queries.
 *
 * Under basic composition, the total privacy cost of k queries with budgets
 * ε₁…εₖ is ε₁ + … + εₖ. This manager refuses queries once the budget is
 * exhausted, preventing unbounded privacy leakage.
 */

import { appLogger as logger } from './logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BudgetStatus {
  totalBudget: number;
  consumed: number;
  remaining: number;
  exhausted: boolean;
}

// ─── Manager ──────────────────────────────────────────────────────────────────

export class PrivacyBudgetManager {
  private totalBudget: number;
  private consumed: number = 0;

  /**
   * @param totalBudget  Maximum cumulative epsilon allowed (e.g. 10.0).
   */
  constructor(totalBudget: number) {
    if (totalBudget <= 0) throw new Error('totalBudget must be positive');
    this.totalBudget = totalBudget;
  }

  /**
   * Attempt to consume `epsilon` from the budget.
   *
   * @returns `true` if the budget was available and has been consumed;
   *          `false` if the budget is exhausted (query should be suppressed).
   */
  consume(epsilon: number): boolean {
    if (epsilon <= 0) throw new Error('epsilon must be positive');

    if (this.consumed + epsilon > this.totalBudget) {
      logger.warn(
        `PrivacyBudgetManager: budget exhausted. ` +
          `Requested ${epsilon}, consumed ${this.consumed}/${this.totalBudget}`
      );
      return false;
    }

    this.consumed += epsilon;
    logger.debug(
      `PrivacyBudgetManager: consumed ${epsilon}. Total: ${this.consumed}/${this.totalBudget}`
    );
    return true;
  }

  /** Returns the current budget status. */
  getStatus(): BudgetStatus {
    return {
      totalBudget: this.totalBudget,
      consumed: this.consumed,
      remaining: Math.max(0, this.totalBudget - this.consumed),
      exhausted: this.consumed >= this.totalBudget,
    };
  }

  /** Reset the consumed budget (e.g. at the start of a new session). */
  reset(): void {
    this.consumed = 0;
    logger.info('PrivacyBudgetManager: budget reset');
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

/** Default session budget: ε = 10 (generous for analytics, tight for sensitive data). */
export const privacyBudgetManager = new PrivacyBudgetManager(10);
export default privacyBudgetManager;

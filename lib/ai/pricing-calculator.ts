/**
 * Deterministic Pricing Calculator
 *
 * The LLM must NEVER perform pricing calculations itself. All arithmetic
 * involving dollar amounts, quantities, taxes, discounts, or totals MUST
 * be routed through this module. Results are the single source of truth
 * that the LLM is allowed to quote back to the user.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type CalcOperation =
  | "add"
  | "subtract"
  | "multiply"
  | "divide"
  | "percentage"
  | "quote_total"
  | "discount"
  | "tax"
  | "margin";

export type LineItem = {
  description: string;
  unitPrice: number;
  quantity: number;
};

export type CalcInput = {
  operation: CalcOperation;
  /** Primary operand (e.g. base price, subtotal) */
  a: number;
  /** Secondary operand (e.g. quantity, percentage rate) */
  b?: number;
  /** Line items for quote_total operation */
  lineItems?: LineItem[];
};

export type CalcResult = {
  result: number;
  /** Human-readable breakdown the LLM can paste into its response */
  explanation: string;
  /** Formatted dollar string */
  formatted: string;
  /** Individual line totals when applicable */
  lineBreakdown?: { description: string; total: number; formatted: string }[];
};

// ─── Helpers ────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Calculator ─────────────────────────────────────────────────────

export function calculate(input: CalcInput): CalcResult {
  const { operation, a, b = 0, lineItems } = input;

  switch (operation) {
    case "add": {
      const result = round2(a + b);
      return {
        result,
        explanation: `${fmt(a)} + ${fmt(b)} = ${fmt(result)}`,
        formatted: fmt(result),
      };
    }

    case "subtract": {
      const result = round2(a - b);
      return {
        result,
        explanation: `${fmt(a)} - ${fmt(b)} = ${fmt(result)}`,
        formatted: fmt(result),
      };
    }

    case "multiply": {
      const result = round2(a * b);
      return {
        result,
        explanation: `${fmt(a)} × ${b} = ${fmt(result)}`,
        formatted: fmt(result),
      };
    }

    case "divide": {
      if (b === 0) {
        return { result: 0, explanation: "Cannot divide by zero.", formatted: "$0.00" };
      }
      const result = round2(a / b);
      return {
        result,
        explanation: `${fmt(a)} ÷ ${b} = ${fmt(result)}`,
        formatted: fmt(result),
      };
    }

    case "percentage": {
      // b% of a
      const result = round2((a * b) / 100);
      return {
        result,
        explanation: `${b}% of ${fmt(a)} = ${fmt(result)}`,
        formatted: fmt(result),
      };
    }

    case "discount": {
      // Apply b% discount to a
      const discountAmount = round2((a * b) / 100);
      const result = round2(a - discountAmount);
      return {
        result,
        explanation: `${fmt(a)} less ${b}% discount (${fmt(discountAmount)}) = ${fmt(result)}`,
        formatted: fmt(result),
      };
    }

    case "tax": {
      // Add b% tax to a (default 10% GST for Australia)
      const rate = b || 10;
      const taxAmount = round2((a * rate) / 100);
      const result = round2(a + taxAmount);
      return {
        result,
        explanation: `${fmt(a)} + ${rate}% tax (${fmt(taxAmount)}) = ${fmt(result)} inc. GST`,
        formatted: fmt(result),
      };
    }

    case "margin": {
      // Calculate sell price from cost (a) at margin% (b)
      if (b >= 100) {
        return { result: 0, explanation: "Margin cannot be 100% or more.", formatted: "$0.00" };
      }
      const result = round2(a / (1 - b / 100));
      return {
        result,
        explanation: `Cost ${fmt(a)} at ${b}% margin = sell price ${fmt(result)}`,
        formatted: fmt(result),
      };
    }

    case "quote_total": {
      const items = lineItems ?? [];
      if (items.length === 0 && a > 0) {
        // Shorthand: a = subtotal, b = tax rate
        const rate = b || 10;
        const taxAmount = round2((a * rate) / 100);
        const total = round2(a + taxAmount);
        return {
          result: total,
          explanation: `Subtotal ${fmt(a)} + ${rate}% GST (${fmt(taxAmount)}) = ${fmt(total)}`,
          formatted: fmt(total),
        };
      }

      const lineBreakdown = items.map((item) => {
        const lineTotal = round2(item.unitPrice * item.quantity);
        return {
          description: item.description,
          total: lineTotal,
          formatted: fmt(lineTotal),
        };
      });

      const subtotal = round2(lineBreakdown.reduce((sum, l) => sum + l.total, 0));
      const callOutFee = round2(a); // a = call-out fee (0 if none)
      const subtotalWithCallOut = round2(subtotal + callOutFee);
      const taxRate = b || 10;
      const tax = round2((subtotalWithCallOut * taxRate) / 100);
      const total = round2(subtotalWithCallOut + tax);

      const lines = lineBreakdown.map((l) => `  ${l.description}: ${l.formatted}`).join("\n");
      let explanation = `Line items:\n${lines}\n  Subtotal: ${fmt(subtotal)}`;
      if (callOutFee > 0) {
        explanation += `\n  Call-out fee: ${fmt(callOutFee)}`;
      }
      explanation += `\n  GST (${taxRate}%): ${fmt(tax)}\n  Total: ${fmt(total)}`;

      return { result: total, explanation, formatted: fmt(total), lineBreakdown };
    }

    default: {
      return { result: 0, explanation: `Unknown operation: ${operation}`, formatted: "$0.00" };
    }
  }
}

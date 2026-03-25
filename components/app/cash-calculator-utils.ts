export type CashCalculatorOperator = "+" | "-" | "×" | "÷";

export type CashCalculatorState = {
  display: string;
  previousValue: number | null;
  operator: CashCalculatorOperator | null;
  waitingForOperand: boolean;
  expression: string;
};

export const INITIAL_CASH_CALCULATOR_STATE: CashCalculatorState = {
  display: "0",
  previousValue: null,
  operator: null,
  waitingForOperand: false,
  expression: ""
};

function parseDisplay(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function trimTrailingZeros(value: string) {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
}

export function formatCalculatorNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "Error";
  }

  const safe = Object.is(value, -0) ? 0 : value;
  const rendered =
    Math.abs(safe) >= 1e12 || (Math.abs(safe) > 0 && Math.abs(safe) < 1e-9)
      ? safe.toExponential(8)
      : safe.toFixed(8);
  return trimTrailingZeros(rendered);
}

function applyOperation(left: number, right: number, operator: CashCalculatorOperator) {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "×":
      return left * right;
    case "÷":
      if (right === 0) return Number.NaN;
      return left / right;
    default:
      return right;
  }
}

function calculateResult(state: CashCalculatorState) {
  if (state.operator === null || state.previousValue === null) {
    return null;
  }

  const currentValue = parseDisplay(state.display);
  const result = applyOperation(state.previousValue, currentValue, state.operator);
  return {
    currentValue,
    result
  };
}

export function inputDigit(state: CashCalculatorState, digit: string): CashCalculatorState {
  if (!/^\d$/.test(digit)) return state;

  if (state.display === "Error" || state.waitingForOperand) {
    return {
      ...state,
      display: digit,
      waitingForOperand: false
    };
  }

  return {
    ...state,
    display: state.display === "0" ? digit : `${state.display}${digit}`
  };
}

export function inputDecimal(state: CashCalculatorState): CashCalculatorState {
  if (state.display === "Error") {
    return {
      ...INITIAL_CASH_CALCULATOR_STATE,
      display: "0."
    };
  }

  if (state.waitingForOperand) {
    return {
      ...state,
      display: "0.",
      waitingForOperand: false
    };
  }

  if (state.display.includes(".")) return state;
  return {
    ...state,
    display: `${state.display}.`
  };
}

export function clearCalculator(): CashCalculatorState {
  return { ...INITIAL_CASH_CALCULATOR_STATE };
}

export function backspaceCalculator(state: CashCalculatorState): CashCalculatorState {
  if (state.display === "Error") {
    return { ...INITIAL_CASH_CALCULATOR_STATE };
  }

  if (state.waitingForOperand) {
    return state;
  }

  const nextDisplay = state.display.length <= 1 ? "0" : state.display.slice(0, -1);
  return {
    ...state,
    display: nextDisplay === "-" ? "0" : nextDisplay
  };
}

export function setOperator(state: CashCalculatorState, nextOperator: CashCalculatorOperator): CashCalculatorState {
  if (state.display === "Error") {
    return state;
  }

  const currentValue = parseDisplay(state.display);
  if (state.operator && state.previousValue !== null && !state.waitingForOperand) {
    const result = applyOperation(state.previousValue, currentValue, state.operator);
    if (!Number.isFinite(result)) {
      return {
        ...INITIAL_CASH_CALCULATOR_STATE,
        display: "Error"
      };
    }

    return {
      display: formatCalculatorNumber(result),
      previousValue: result,
      operator: nextOperator,
      waitingForOperand: true,
      expression: `${formatCalculatorNumber(result)} ${nextOperator}`
    };
  }

  return {
    ...state,
    previousValue: currentValue,
    operator: nextOperator,
    waitingForOperand: true,
    expression: `${formatCalculatorNumber(currentValue)} ${nextOperator}`
  };
}

export function applyPercent(state: CashCalculatorState): CashCalculatorState {
  if (state.display === "Error") {
    return state;
  }

  const currentValue = parseDisplay(state.display);
  let percentValue = currentValue / 100;
  if ((state.operator === "+" || state.operator === "-") && state.previousValue !== null) {
    percentValue = (state.previousValue * currentValue) / 100;
  }

  return {
    ...state,
    display: formatCalculatorNumber(percentValue),
    waitingForOperand: false
  };
}

export function evaluateCalculator(state: CashCalculatorState): CashCalculatorState {
  const calculation = calculateResult(state);
  if (!calculation) return state;

  if (!Number.isFinite(calculation.result)) {
    return {
      ...INITIAL_CASH_CALCULATOR_STATE,
      display: "Error"
    };
  }

  return {
    display: formatCalculatorNumber(calculation.result),
    previousValue: null,
    operator: null,
    waitingForOperand: true,
    expression: `${formatCalculatorNumber(state.previousValue || 0)} ${state.operator} ${formatCalculatorNumber(calculation.currentValue)} =`
  };
}

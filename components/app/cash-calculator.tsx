"use client";

import { useState } from "react";
import { Delete, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  applyPercent,
  backspaceCalculator,
  clearCalculator,
  evaluateCalculator,
  INITIAL_CASH_CALCULATOR_STATE,
  inputDecimal,
  inputDigit,
  setOperator,
  type CashCalculatorOperator
} from "@/components/app/cash-calculator-utils";

const DIGIT_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["0", ".", "="]
] as const;

const OPERATORS: Array<{ value: CashCalculatorOperator; label: string }> = [
  { value: "÷", label: "÷" },
  { value: "×", label: "×" },
  { value: "-", label: "-" },
  { value: "+", label: "+" }
];

export function CashCalculator() {
  const [state, setState] = useState(INITIAL_CASH_CALCULATOR_STATE);

  return (
    <Card className="border-white/6 bg-card/90">
      <CardHeader action={<Badge variant="success">Lista</Badge>}>
        <div>
          <CardTitle className="text-xl">Mini calculadora</CardTitle>
          <CardDescription>Utilidad rapida para sumas, diferencias, porcentajes y cierres de caja sin salir del modulo.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-[24px] border border-[color:var(--border)] bg-surface/55 p-4">
          <div className="rounded-[22px] border border-[color:var(--border)] bg-card/90 px-4 py-3">
            <p className="min-h-5 text-right text-xs uppercase tracking-[0.16em] text-muted">
              {state.expression || "Calculadora local"}
            </p>
            <p className="mt-3 overflow-hidden text-right text-3xl font-semibold tracking-tight">
              {state.display}
            </p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px]">
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <CalculatorKey
                  label="AC"
                  variant="secondary"
                  onClick={() => setState(clearCalculator())}
                />
                <CalculatorKey
                  label="%"
                  icon={<Percent className="h-4 w-4" />}
                  variant="secondary"
                  onClick={() => setState((current) => applyPercent(current))}
                />
                <CalculatorKey
                  label="DEL"
                  icon={<Delete className="h-4 w-4" />}
                  variant="secondary"
                  onClick={() => setState((current) => backspaceCalculator(current))}
                />
              </div>

              {DIGIT_ROWS.map((row) => (
                <div key={row.join("-")} className="grid grid-cols-3 gap-3">
                  {row.map((key) => (
                    <CalculatorKey
                      key={key}
                      label={key}
                      variant={key === "=" ? "accent" : "default"}
                      onClick={() =>
                        setState((current) => {
                          if (key === ".") return inputDecimal(current);
                          if (key === "=") return evaluateCalculator(current);
                          return inputDigit(current, key);
                        })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              {OPERATORS.map((operator) => (
                <CalculatorKey
                  key={operator.value}
                  label={operator.label}
                  variant="operator"
                  onClick={() => setState((current) => setOperator(current, operator.value))}
                />
              ))}
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">
            El porcentaje sigue una regla de calculadora comun: si ya hay un operador, convierte el valor actual en porcentaje del primero.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CalculatorKey({
  label,
  onClick,
  variant = "default",
  icon
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "secondary" | "operator" | "accent";
  icon?: React.ReactNode;
}) {
  const className =
    variant === "operator"
      ? "border-brandBright/30 bg-brandBright/10 text-brandBright hover:bg-brandBright/18"
      : variant === "accent"
        ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/20"
        : variant === "secondary"
          ? "border-white/10 bg-card/90 text-muted hover:bg-card"
          : "border-[color:var(--border)] bg-surface/70 text-text hover:bg-surface";

  return (
    <Button
      type="button"
      variant="ghost"
      className={`h-14 rounded-2xl border text-base font-semibold ${className}`}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
    </Button>
  );
}

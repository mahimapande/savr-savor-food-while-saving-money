import { useState } from "react";
import { PlanDebugInfo } from "@/data/mockData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Bug, Copy, Check, AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  debug: PlanDebugInfo;
}

const PlanDebugPanel = ({ debug }: Props) => {
  const [open, setOpen] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedFinal, setCopiedFinal] = useState(false);

  const copyToClipboard = (json: unknown, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // Build overview rows
  const allIngredients = new Set([
    ...Object.keys(debug.pantryUsageBeforeEnforcement),
    ...Object.keys(debug.pantryUsageAfterEnforcement),
    ...debug.excessMovedToGrocery.map((e) => e.name),
  ]);

  const pantryMapFromInputs: Record<string, { maxQty: number; unit: string }> = {};
  // Reconstruct from rawPlan pantryItems
  for (const item of debug.rawPlan.pantryItems) {
    pantryMapFromInputs[item.normalizedName] = { maxQty: item.qty, unit: item.unit };
  }

  const rows = [...allIngredients].map((name) => {
    const raw = debug.pantryUsageBeforeEnforcement[name];
    const final = debug.pantryUsageAfterEnforcement[name];
    const excess = debug.excessMovedToGrocery.find((e) => e.name === name);
    const pantryMax = pantryMapFromInputs[name];
    const exceeded = raw && pantryMax && raw.totalQty > pantryMax.maxQty;
    return { name, pantryMax, raw, final, excess, exceeded };
  });

  const { validation } = debug;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between border-dashed border-muted-foreground/30 bg-muted/30 text-muted-foreground hover:bg-muted/50"
        >
          <span className="flex items-center gap-2 text-xs font-mono">
            <Bug className="h-3.5 w-3.5" />
            Debug Panel (dev only)
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 border-dashed border-muted-foreground/30 bg-muted/20 p-4">
          {/* Inputs summary */}
          {debug.inputsSummary && (
            <div className="mb-4 space-y-1.5 rounded-md border border-muted-foreground/20 bg-background/40 p-3 text-xs font-mono">
              <div className="mb-1 font-semibold text-foreground">Inputs sent to AI</div>
              <SummaryRow label="Budget" value={debug.inputsSummary.budget ? `$${debug.inputsSummary.budget}` : "—"} />
              <SummaryRow
                label="Meal counts"
                value={
                  debug.inputsSummary.mealCounts
                    ? Object.entries(debug.inputsSummary.mealCounts)
                        .filter(([, n]) => n > 0)
                        .map(([k, n]) => `${k}:${n}`)
                        .join(", ") || "—"
                    : "—"
                }
              />
              <SummaryRow label="Dietary" value={debug.inputsSummary.dietary.join(", ") || "—"} />
              <div className="flex gap-2">
                <span className="w-28 shrink-0 text-muted-foreground">Allergies:</span>
                <span className="flex-1">
                  {debug.inputsSummary.allergies.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {debug.inputsSummary.allergies.map((a) => (
                        <Badge key={a} variant="destructive" className="px-1.5 py-0 text-[10px] font-mono">
                          {a}
                        </Badge>
                      ))}
                    </span>
                  )}
                </span>
              </div>
              <SummaryRow label="Cuisines" value={debug.inputsSummary.cuisines.join(", ") || "—"} />
              <SummaryRow label="Pantry" value={debug.inputsSummary.pantryItems.join("; ") || "—"} />
              <SummaryRow label="Preference" value={debug.inputsSummary.preference || "—"} />
            </div>
          )}

          {/* Schedule health row — at-a-glance coverage status */}
          {debug.coverage && (
            <div className="mb-3 rounded-md border border-muted-foreground/20 bg-background/40 p-3 text-xs font-mono">
              <div className="mb-1.5 font-semibold text-foreground">Schedule health</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={
                    debug.scheduleCoverageFailed
                      ? "destructive"
                      : debug.coverage.filled === debug.coverage.requested
                        ? "default"
                        : "secondary"
                  }
                  className="text-[10px] font-mono"
                >
                  {debug.coverage.filled}/{debug.coverage.requested} slots
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  retries: {debug.coverage.retryCount}
                </Badge>
                {debug.coverage.overFilled && (
                  <Badge variant="destructive" className="text-[10px] font-mono">
                    over-filled {debug.coverage.filledBeforeTrim} → trimmed {debug.coverage.trimmedCount}
                  </Badge>
                )}
                {debug.scheduleCoverageFailed && (
                  <Badge variant="destructive" className="text-[10px] font-mono">
                    coverage FAILED
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Validation badges */}
          <div className="mb-4 flex flex-wrap gap-2">
            <ValidationBadge label="Schema valid" ok={validation.schemaValid} />
            <ValidationBadge label="Pantry capped" ok={validation.pantryCapped} />
            <ValidationBadge label="Metrics recomputed" ok={validation.metricsRecomputed} />
            {validation.invariantsOk !== undefined && (
              <ValidationBadge label="Invariants" ok={validation.invariantsOk} />
            )}
          </div>

          {/* Invariant violations list */}
          {validation.invariantViolations && validation.invariantViolations.length > 0 && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs font-mono">
              <div className="mb-1 font-semibold text-destructive">Invariant violations</div>
              <ul className="space-y-1">
                {validation.invariantViolations.map((v, i) => (
                  <li key={i} className="text-destructive">
                    <span className="font-semibold">[{v.code}]</span> {v.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="raw" className="text-xs">Raw JSON</TabsTrigger>
              <TabsTrigger value="final" className="text-xs">Final JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-muted-foreground/20 text-left text-muted-foreground">
                      <th className="pb-1 pr-3">Ingredient</th>
                      <th className="pb-1 pr-3">Pantry Max</th>
                      <th className="pb-1 pr-3">Raw Usage</th>
                      <th className="pb-1 pr-3">Final Usage</th>
                      <th className="pb-1">Excess → Grocery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.name}
                        className={`border-b border-muted-foreground/10 ${row.exceeded ? "bg-destructive/10" : ""}`}
                      >
                        <td className="py-1 pr-3 font-medium text-foreground">
                          {row.name}
                          {row.exceeded && <AlertTriangle className="inline ml-1 h-3 w-3 text-destructive" />}
                        </td>
                        <td className="py-1 pr-3 text-muted-foreground">
                          {row.pantryMax ? `${row.pantryMax.maxQty} ${row.pantryMax.unit}` : "—"}
                        </td>
                        <td className="py-1 pr-3 text-muted-foreground">
                          {row.raw ? `${row.raw.totalQty} ${row.raw.unit}` : "—"}
                        </td>
                        <td className="py-1 pr-3 text-muted-foreground">
                          {row.final ? `${row.final.usedQty} ${row.final.unit}` : "—"}
                        </td>
                        <td className="py-1 text-muted-foreground">
                          {row.excess ? (
                            <span className="text-destructive font-medium">
                              +{row.excess.qty} {row.excess.unit}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-3 text-center text-muted-foreground">
                          No pantry ingredients used
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="raw" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => copyToClipboard(debug.rawPlan, setCopiedRaw)}
                >
                  {copiedRaw ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedRaw ? "Copied" : "Copy raw JSON"}
                </Button>
              </div>
              <pre className="max-h-80 overflow-auto rounded bg-muted p-3 text-[10px] leading-tight text-foreground">
                {JSON.stringify(debug.rawPlan, null, 2)}
              </pre>
            </TabsContent>

            <TabsContent value="final" className="mt-3">
              <div className="flex justify-end mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => copyToClipboard(debug.finalPlan, setCopiedFinal)}
                >
                  {copiedFinal ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedFinal ? "Copied" : "Copy final JSON"}
                </Button>
              </div>
              <pre className="max-h-80 overflow-auto rounded bg-muted p-3 text-[10px] leading-tight text-foreground">
                {JSON.stringify(debug.finalPlan, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}:</span>
      <span className="flex-1 break-words text-foreground">{value}</span>
    </div>
  );
}

function ValidationBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <Badge
      variant={ok ? "default" : "destructive"}
      className="gap-1 text-[10px] font-mono"
    >
      {ok ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}
    </Badge>
  );
}

export default PlanDebugPanel;

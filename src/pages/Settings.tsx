import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getShowDebugTools, setShowDebugTools } from "@/hooks/use-dev-settings";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Bug } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const [debugTools, setDebugToolsState] = useState(() => getShowDebugTools());

  const toggleDebug = (checked: boolean) => {
    setDebugToolsState(checked);
    setShowDebugTools(checked);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <h1 className="mb-1 font-serif text-2xl text-foreground">Settings</h1>
        <p className="mb-6 text-sm text-muted-foreground">App preferences</p>

        {import.meta.env.DEV && (
          <Card className="border-dashed border-muted-foreground/30 bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Bug className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Developer</h2>
              <Badge variant="outline" className="text-[10px] font-mono border-muted-foreground/40 text-muted-foreground">Dev</Badge>
            </div>
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="debug-toggle" className="cursor-pointer">
                <span className="text-sm font-medium text-foreground">Show debug tools</span>
                <p className="text-xs text-muted-foreground mt-0.5">Shows temporary developer diagnostics on the plan page.</p>
              </label>
              <Switch id="debug-toggle" checked={debugTools} onCheckedChange={toggleDebug} />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Settings;

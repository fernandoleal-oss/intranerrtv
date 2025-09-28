import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface BudgetTypeCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onStart: () => void;
}

export const BudgetTypeCard = ({ icon: Icon, title, description, onStart }: BudgetTypeCardProps) => {
  return (
    <Card className="group h-full transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 border-border/50 hover:border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        <CardDescription className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </CardDescription>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onStart}
          className="w-full font-medium"
          size="lg"
        >
          Começar
        </Button>
      </CardFooter>
    </Card>
  );
};
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
    <Card className="group h-full hover-lift border-border/50 hover:border-primary/30 card-gradient shadow-elegant hover:shadow-glow">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary group-hover:from-primary group-hover:to-primary/90 group-hover:text-primary-foreground transition-all duration-300 group-hover:scale-110">
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-bold mb-1 group-hover:text-primary transition-colors duration-300">{title}</CardTitle>
            <CardDescription className="text-sm leading-relaxed text-muted-foreground/80 group-hover:text-muted-foreground transition-colors duration-300">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardFooter className="pt-2">
        <Button 
          onClick={onStart}
          className="w-full font-semibold h-11 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-md hover:shadow-lg transition-all duration-300"
          size="lg"
        >
          Começar orçamento
        </Button>
      </CardFooter>
    </Card>
  );
};
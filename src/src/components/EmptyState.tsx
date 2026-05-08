import { ReactNode } from "react";

interface Props {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ emoji = "✨", title, description, action }: Props) {
  return (
    <div className="rounded-2xl bg-muted p-8 text-center">
      <p className="text-4xl">{emoji}</p>
      <p className="mt-2 font-bold text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

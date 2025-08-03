'use client';

import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type AIToolStatus = 'pending' | 'running' | 'completed' | 'error';

export type AIToolProps = ComponentProps<typeof Collapsible> & {
  status?: AIToolStatus;
};

export const AITool = ({
  className,
  status = 'pending',
  ...props
}: AIToolProps) => (
  <Collapsible
    className={cn('not-prose mb-4 w-full rounded-md border', className)}
    {...props}
  />
);

export type AIToolHeaderProps = ComponentProps<typeof CollapsibleTrigger> & {
  status?: AIToolStatus;
  name: string;
  description?: string;
};

const getStatusBadge = (status: AIToolStatus) => {
  const labels = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    error: 'Error',
  } as const;

  const icons = {
    pending: <CircleIcon className="size-4" />,
    running: <ClockIcon className="size-4 animate-pulse" />,
    completed: <CheckCircleIcon className="size-4" />,
    error: <XCircleIcon className="size-4" />,
  } as const;

  const variants = {
    pending: 'warning' as const,
    running: 'secondary' as const,
    completed: 'default' as const,
    error: 'destructive' as const,
  };

  return (
    <Badge className="gap-1" variant={variants[status]}>
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const AIToolHeader = ({
  className,
  status = 'pending',
  name,
  description,
  ...props
}: AIToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex w-full items-center justify-between gap-4 p-3',
      className,
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      <WrenchIcon className="size-4 text-muted-foreground" />
      <span className="font-medium text-sm">{name}</span>
      {getStatusBadge(status)}
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
  </CollapsibleTrigger>
);

export type AIToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const AIToolContent = ({ className, ...props }: AIToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'grid gap-4 overflow-hidden border-t text-sm data-[state=closed]:hidden',
      'data-[state=open]:p-4 data-[state=closed]:p-0',
      className,
    )}
    {...props}
  />
);

export type AIToolParametersProps = ComponentProps<'div'> & {
  parameters: Record<string, unknown>;
};

export const AIToolParameters = ({
  className,
  parameters,
  ...props
}: AIToolParametersProps) => (
  <div className={cn('space-y-2', className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50 border border-border">
      <ScrollArea className="h-32 w-full">
        <div className="p-3">
          <pre className="whitespace-pre-wrap font-mono text-muted-foreground text-xs leading-relaxed">
            {JSON.stringify(parameters, null, 2)}
          </pre>
        </div>
      </ScrollArea>
    </div>
  </div>
);

export type AIToolResultProps = ComponentProps<'div'> & {
  result?: ReactNode;
  error?: string;
};

export const AIToolResult = ({
  className,
  result,
  error,
  ...props
}: AIToolResultProps) => {
  if (!(result || error)) {
    return null;
  }

  // Helper function to format result content for better display
  const formatResultContent = (content: ReactNode) => {
    if (typeof content === 'string') {
      // Try to parse as JSON for better formatting
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch {
        // Not JSON, return as-is with proper formatting
        return (
          <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {content}
          </div>
        );
      }
    }
    return (
      <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
        {content}
      </div>
    );
  };

  return (
    <div className={cn('space-y-2', className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {error ? 'Error' : 'Result'}
      </h4>
      <div
        className={cn(
          'rounded-md border',
          error
            ? 'bg-destructive/10 border-destructive/20'
            : 'bg-muted/50 border-border',
        )}
      >
        <ScrollArea className="h-48 w-full">
          <div
            className={cn(
              'p-3',
              error ? 'text-destructive' : 'text-foreground',
            )}
          >
            {error ? (
              <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {error}
              </div>
            ) : (
              formatResultContent(result)
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

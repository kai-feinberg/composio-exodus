'use client';

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className: string;
  children: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  if (!inline) {
    return (
      <div className="not-prose flex flex-col">
        <pre
          {...props}
          className={`text-sm w-full overflow-x-auto bg-muted p-4 border rounded-xl text-foreground font-mono`}
        >
          <code className="whitespace-pre-wrap break-words font-mono">{children}</code>
        </pre>
      </div>
    );
  } else {
    return (
      <code
        className={`${className} text-sm bg-muted py-0.5 px-1 rounded-md font-mono`}
        {...props}
      >
        {children}
      </code>
    );
  }
}

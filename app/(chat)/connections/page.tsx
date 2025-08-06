import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ToolkitList } from '@/components/toolkit-list';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Settings, Zap } from 'lucide-react';

export default async function ConnectionsPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Connected Services</h1>
            <p className="text-muted-foreground">
              Manage your connected accounts and enable AI-powered automation
            </p>
          </div>
        </div>
      </div>

      {/* Features Overview */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="size-5 text-primary" />
            <span>AI-Powered Automation</span>
          </CardTitle>
          <CardDescription>
            Connect your favorite services to unlock powerful AI capabilities in
            your chats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                <div className="size-2 bg-blue-500 rounded-full" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Google Workspace</h4>
                <p className="text-xs text-muted-foreground">
                  Gmail, Docs, Drive integration for productivity
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-sky-100 dark:bg-sky-900/30 rounded">
                <div className="size-2 bg-sky-500 rounded-full" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Social & Content</h4>
                <p className="text-xs text-muted-foreground">
                  Twitter, YouTube, Reddit content management
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-yellow-100 dark:bg-yellow-900/30 rounded">
                <div className="size-2 bg-yellow-600 rounded-full" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Productivity Tools</h4>
                <p className="text-xs text-muted-foreground">
                  Notion, Slack for workspace management
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                <div className="size-2 bg-purple-500 rounded-full" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Marketing & Research</h4>
                <p className="text-xs text-muted-foreground">
                  Active Campaign, EXA for outreach & discovery
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolkit List */}
      <ToolkitList />
    </div>
  );
}

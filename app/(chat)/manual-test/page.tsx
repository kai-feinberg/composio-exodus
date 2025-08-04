'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, TestTube, Loader2 } from 'lucide-react';

interface EmailData {
  id: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ body?: { data?: string }; mimeType?: string }>;
  };
}

export default function ManualTestPage() {
  const [loading, setLoading] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailData, setEmailData] = useState<EmailData | null>(null);

  const fetchLatestEmail = async () => {
    setLoading(true);
    setError(null);
    setEmailContent('');
    setEmailData(null);

    try {
      const response = await fetch('/api/manual-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.email) {
        setEmailData(data.email);

        // The new response structure already includes parsed email data
        const email = data.email;

        const subject = email.subject || 'No Subject';
        const from = email.sender || 'Unknown Sender';
        const date = email.messageTimestamp || 'Unknown Date';
        const messageText = email.messageText || 'No content available';

        const formattedEmail = `Subject: ${subject}\nFrom: ${from}\nDate: ${date}\nMessage ID: ${email.messageId}\nThread ID: ${email.threadId}\n\n${messageText}`;
        setEmailContent(formattedEmail);
      } else {
        setError(data.message || data.error || 'Failed to fetch email');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TestTube className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Composio Manual Test</h1>
            <p className="text-muted-foreground">
              Manually call a tool on the user's behalf using Composio's execute
              method by fetching your latest Gmail message
            </p>
          </div>
        </div>
      </div>

      {/* Feature Info Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="size-5 text-primary" />
            <span>Gmail Execute Demo</span>
          </CardTitle>
          <CardDescription>
            This demonstrates manually calling a tool on the user's behalf using
            Composio's execute method with the GMAIL_FETCH_EMAILS tool, which
            automatically handles authentication using your connected Gmail
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">How it works:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Uses your connected Gmail account credentials</li>
                <li>Calls Composio's GMAIL_FETCH_EMAILS tool</li>
                <li>Fetches the most recent email from your inbox</li>
                <li>Displays the email content with proper parsing</li>
              </ol>
            </div>

            <Button
              onClick={fetchLatestEmail}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Fetching Latest Email...
                </>
              ) : (
                <>
                  <Mail className="size-4 mr-2" />
                  Fetch Latest Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email Content Display */}
      <Card>
        <CardHeader>
          <CardTitle>Email Content</CardTitle>
          <CardDescription>
            The fetched email content will appear below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Email content will appear here after fetching..."
            value={emailContent}
            readOnly
            rows={20}
            className="resize-none font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Raw Data Display (for debugging) */}
      {emailData && (
        <Card>
          <CardHeader>
            <CardTitle>Raw API Response</CardTitle>
            <CardDescription>
              Raw Gmail API response data (for debugging)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(emailData, null, 2)}
              readOnly
              rows={10}
              className="resize-none font-mono text-xs"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

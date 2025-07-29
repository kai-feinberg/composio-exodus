'use client';

import { useState, useEffect } from 'react';
import { Bot, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import type { Agent } from '@/lib/db/schema';
import { toast } from 'sonner';
import { chatModels } from '@/lib/ai/models';
import { FileDropzone } from './ui/file-dropzone';
import {
  extractTextFromDocx,
  type DocxProcessingResult,
} from '@/lib/utils/docx-processor';

interface AgentManagementProps {
  isOpen: boolean;
  onClose: () => void;
  editingAgent: Agent | null;
}

interface AgentFormData {
  name: string;
  description: string;
  systemPrompt: string;
  modelId: string;
}

interface FileUploadState {
  isUploading: boolean;
  selectedFile: File | null;
  extractedText: string;
  processingResult: DocxProcessingResult | null;
  error: string;
}

const initialFormData: AgentFormData = {
  name: '',
  description: '',
  systemPrompt: '',
  modelId: 'chat-model',
};

const initialFileUploadState: FileUploadState = {
  isUploading: false,
  selectedFile: null,
  extractedText: '',
  processingResult: null,
  error: '',
};

export function AgentManagement({
  isOpen,
  onClose,
  editingAgent,
}: AgentManagementProps) {
  const [formData, setFormData] = useState<AgentFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useFileUpload, setUseFileUpload] = useState(false);
  const [fileUploadState, setFileUploadState] = useState<FileUploadState>(
    initialFileUploadState,
  );

  // Reset form when dialog opens/closes or editing agent changes
  useEffect(() => {
    if (isOpen) {
      if (editingAgent) {
        setFormData({
          name: editingAgent.name,
          description: editingAgent.description || '',
          systemPrompt: editingAgent.systemPrompt,
          modelId: editingAgent.modelId,
        });
      } else {
        setFormData(initialFormData);
      }
      setUseFileUpload(false);
      setFileUploadState(initialFileUploadState);
    }
  }, [isOpen, editingAgent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.systemPrompt.trim()) {
      toast.error('Name and system prompt are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingAgent
        ? `/api/agents/${editingAgent.id}`
        : '/api/agents';
      const method = editingAgent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          systemPrompt: formData.systemPrompt.trim(),
          modelId: formData.modelId,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to ${editingAgent ? 'update' : 'create'} agent`,
        );
      }

      toast.success(
        `Agent ${editingAgent ? 'updated' : 'created'} successfully`,
      );

      onClose();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error(`Failed to ${editingAgent ? 'update' : 'create'} agent`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleFileSelect = async (file: File) => {
    setFileUploadState((prev) => ({
      ...prev,
      selectedFile: file,
      isUploading: true,
      error: '',
    }));

    try {
      const result = await extractTextFromDocx(file);

      setFileUploadState((prev) => ({
        ...prev,
        isUploading: false,
        extractedText: result.text,
        processingResult: result,
      }));

      // Update form data with extracted text
      setFormData((prev) => ({
        ...prev,
        systemPrompt: result.text,
      }));

      toast.success(`Extracted ${result.wordCount} words from document`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to process file';
      setFileUploadState((prev) => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
    }
  };

  const handleFileRemove = () => {
    setFileUploadState(initialFileUploadState);
    if (useFileUpload) {
      setFormData((prev) => ({ ...prev, systemPrompt: '' }));
    }
  };

  const toggleInputMode = () => {
    const newUseFileUpload = !useFileUpload;
    setUseFileUpload(newUseFileUpload);

    if (!newUseFileUpload) {
      // Switching to manual input - keep extracted text if available
      setFileUploadState((prev) => ({
        ...prev,
        selectedFile: null,
        error: '',
      }));
    } else {
      // Switching to file upload - clear any existing text if no file processed
      if (!fileUploadState.extractedText) {
        setFormData((prev) => ({ ...prev, systemPrompt: '' }));
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot size={20} />
            {editingAgent ? 'Edit Agent' : 'Create New Agent'}
          </DialogTitle>
          <DialogDescription>
            {editingAgent
              ? "Update your agent's configuration"
              : 'Create a new AI agent with custom instructions. You can upload .docx files for system prompts!'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter agent name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Enter agent description (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modelId">Model</Label>
            <Select
              value={formData.modelId}
              onValueChange={(value) =>
                setFormData({ ...formData, modelId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {chatModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="systemPrompt">System Prompt *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleInputMode}
                className="h-8 px-2 text-xs"
              >
                {useFileUpload ? (
                  <>
                    <ToggleRight className="size-4 mr-1" />
                    File Upload
                  </>
                ) : (
                  <>
                    <ToggleLeft className="size-4 mr-1" />
                    Manual Input
                  </>
                )}
              </Button>
            </div>

            {useFileUpload ? (
              <div className="space-y-3">
                <FileDropzone
                  onFileSelect={handleFileSelect}
                  onFileRemove={handleFileRemove}
                  selectedFile={fileUploadState.selectedFile}
                  isProcessing={fileUploadState.isUploading}
                  error={fileUploadState.error}
                  success={
                    fileUploadState.processingResult
                      ? `Extracted ${fileUploadState.processingResult.characterCount} characters, ${fileUploadState.processingResult.wordCount} words`
                      : undefined
                  }
                />

                {fileUploadState.extractedText && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">
                        Extracted Content Preview
                      </Label>
                      <div className="text-xs text-muted-foreground">
                        {fileUploadState.processingResult?.characterCount}{' '}
                        chars, {fileUploadState.processingResult?.wordCount}{' '}
                        words
                      </div>
                    </div>
                    <Textarea
                      value={formData.systemPrompt}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          systemPrompt: e.target.value,
                        })
                      }
                      placeholder="Extracted text will appear here..."
                      rows={6}
                      className="font-mono text-sm"
                      required
                    />
                    {fileUploadState.processingResult?.warnings &&
                      fileUploadState.processingResult.warnings.length > 0 && (
                        <div className="text-xs text-amber-600">
                          <strong>Processing warnings:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {fileUploadState.processingResult.warnings.map(
                              (warning) => (
                                <li key={warning}>{warning}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                )}
              </div>
            ) : (
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) =>
                  setFormData({ ...formData, systemPrompt: e.target.value })
                }
                placeholder="Enter the system prompt that defines the agent's behavior..."
                rows={6}
                required
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              <X className="size-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="size-4 mr-2" />
              {isSubmitting
                ? 'Saving...'
                : editingAgent
                  ? 'Update Agent'
                  : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

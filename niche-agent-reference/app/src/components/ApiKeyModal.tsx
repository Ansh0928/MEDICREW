import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('healthai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('healthai_api_key', apiKey.trim());
      setIsSaved(true);
      toast.success('API key saved! AI features are now active.');
      onOpenChange(false);
      // Reload to apply the new API key
      window.location.reload();
    }
  };

  const handleClear = () => {
    localStorage.removeItem('healthai_api_key');
    setApiKey('');
    setIsSaved(false);
    toast.info('API key removed. Using fallback AI mode.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#1E6FD9]" />
            OpenAI API Configuration
          </DialogTitle>
          <DialogDescription>
            Add your OpenAI API key to enable real AI-powered symptom analysis and diagnostic assistance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">OpenAI API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setIsSaved(false);
              }}
              className="font-mono"
            />
            <p className="text-xs text-[#5A6B7F]">
              Your API key is stored locally in your browser and never sent to our servers.
            </p>
          </div>

          <div className="bg-[#F6F8FA] rounded-lg p-4 text-sm">
            <p className="font-medium text-[#0F1A2A] mb-2">Don't have an API key?</p>
            <ol className="text-[#5A6B7F] space-y-1 list-decimal list-inside">
              <li>Go to{' '}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#1E6FD9] hover:underline inline-flex items-center gap-1"
                >
                  platform.openai.com <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Create a free account or sign in</li>
              <li>Click "Create new secret key"</li>
              <li>Copy and paste the key here</li>
            </ol>
          </div>

          {isSaved && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              <span>API key is configured</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {isSaved && (
            <Button variant="outline" onClick={handleClear} className="flex-1">
              Remove Key
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            className="flex-1 bg-[#1E6FD9] hover:bg-[#1a5fc0] text-white"
            disabled={!apiKey.trim()}
          >
            {isSaved ? 'Update Key' : 'Save API Key'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

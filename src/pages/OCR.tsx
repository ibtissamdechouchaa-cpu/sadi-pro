import { useState, useRef } from 'react';
import { ScanText, Upload, Copy, Check, FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';

export function OCRPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setResult('');
  };

  const handleExtract = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sadi-ai`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setResult(data.text ?? data.content ?? '');
      if (!data.text && !data.content) {
        toast.error(t('aiNotConfiguredDesc'));
      }
    } catch {
      toast.error(t('aiNotConfiguredDesc'));
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success(t('copied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('ocrTitle')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('ocrDesc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle>{t('ocrUpload')}</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div
              onClick={() => inputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition"
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText size={32} className="text-accent" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload size={32} />
                  <p className="text-sm">{t('dragDropHere')}</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <Select label={t('ocrLanguage')} value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
            </Select>

            <Button onClick={handleExtract} disabled={!file || processing} className="w-full">
              {processing ? <Spinner /> : <><ScanText size={18} /> {t('extractText')}</>}
            </Button>
          </div>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('ocrResult')}</CardTitle>
              {result && (
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {t('copyText')}
                </Button>
              )}
            </div>
          </CardHeader>
          {processing ? (
            <div className="py-12 flex justify-center">
              <Spinner className="text-accent" />
            </div>
          ) : result ? (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {result}
            </div>
          ) : (
            <EmptyState title={t('ocrResult')} description={t('ocrDesc')} />
          )}
        </Card>
      </div>
    </div>
  );
}

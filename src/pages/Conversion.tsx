import { useState, useRef } from 'react';
import { Repeat, Upload, Download, FileText, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';

const FORMATS = ['pdf', 'docx', 'html', 'jpg', 'png'] as const;
type TargetFormat = (typeof FORMATS)[number];

export function ConversionPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('pdf');
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setDownloadUrl(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setDownloadUrl(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetFormat', targetFormat);
      formData.append('action', 'convert');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sadi-ai`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error(`Request failed (${response.status})`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      toast.success(t('conversionResult'));
    } catch {
      toast.error(t('aiNotConfiguredDesc'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('conversionTitle')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('conversionDesc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source */}
        <Card>
          <CardHeader>
            <CardTitle>{t('conversionSource')}</CardTitle>
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
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <Select label={t('conversionTarget')} value={targetFormat} onChange={(e) => setTargetFormat(e.target.value as TargetFormat)}>
              {FORMATS.map((f) => (
                <option key={f} value={f}>{f.toUpperCase()}</option>
              ))}
            </Select>

            <Button onClick={handleConvert} disabled={!file || processing} className="w-full">
              {processing ? <Spinner /> : <><Repeat size={18} /> {t('convert')}</>}
            </Button>
          </div>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle>{t('conversionResult')}</CardTitle>
          </CardHeader>
          {processing ? (
            <div className="py-12 flex justify-center">
              <Spinner className="text-accent" />
            </div>
          ) : downloadUrl ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Check size={32} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {file?.name?.split('.')[0] ?? 'document'}.{targetFormat}
              </p>
              <a href={downloadUrl} download={`${file?.name?.split('.')[0] ?? 'document'}.${targetFormat}`}>
                <Button>
                  <Download size={18} />
                  {t('downloadResult')}
                </Button>
              </a>
            </div>
          ) : (
            <EmptyState title={t('conversionResult')} description={t('conversionDesc')} />
          )}
        </Card>
      </div>
    </div>
  );
}

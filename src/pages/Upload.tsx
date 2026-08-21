import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon,
  FileText,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  X,
  Type,
  FileUp,
  ScanText,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { classificationColor, CLASSIFICATIONS } from '@/lib/types';
import type { Category, Person, Classification } from '@/lib/types';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

type UploadMode = 'file' | 'text' | 'scan';

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function UploadPage() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<UploadMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [scannedText, setScannedText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);

  const [form, setForm] = useState({
    file_name: '',
    classification: 'Non-Confidential' as Classification,
    category_id: '',
    person_id: '',
    doc_type: '',
    document_date: '',
    keywords: '',
    notes: '',
    document_number: '',
    retention_years: 5,
    authority: '',
    department: '',
  });

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('people').select('*').order('name'),
    ]).then(([catRes, pplRes]) => {
      setCategories((catRes.data as Category[]) ?? []);
      setPeople((pplRes.data as Person[]) ?? []);
    });
  }, []);

  useEffect(() => {
    if (step !== 2 || aiSuggested || classifying) return;
    const content = mode === 'text' ? textContent : mode === 'scan' ? scannedText : '';
    if (content.trim()) {
      handleClassify(content);
    }
  }, [step]);

  const computedExpiry = useMemo(() => {
    if (!form.document_date) return '';
    const d = new Date(form.document_date);
    d.setFullYear(d.getFullYear() + Number(form.retention_years));
    return d.toISOString().slice(0, 10);
  }, [form.document_date, form.retention_years]);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      toast.error(t('fileTooLarge'));
      return;
    }
    setFile(f);
    setForm((prev) => ({ ...prev, file_name: prev.file_name || f.name }));
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'ocr');
      formData.append('language', 'en');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sadi-ai`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Scan failed');
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setScannedText(data.text ?? data.content ?? '');
      if (!data.text && !data.content) {
        toast.error(t('aiNotConfiguredDesc'));
      } else {
        toast.success(t('extractText'));
      }
    } catch {
      toast.error(t('aiNotConfiguredDesc'));
    } finally {
      setScanning(false);
    }
  };

  const checkDuplicate = async () => {
    const content = mode === 'text' ? textContent : mode === 'scan' ? scannedText : file?.name ?? '';
    if (!content) return;
    const hash = await sha256(content);
    const { data } = await supabase.from('documents').select('id').eq('content_hash', hash).maybeSingle();
    setDuplicateWarning(!!data);
  };

  const handleClassify = async (contentOverride?: string) => {
    const content = contentOverride ?? (mode === 'text' ? textContent : mode === 'scan' ? scannedText : '');
    if (!content.trim() && !file) return;
    setClassifying(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sadi-ai`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'classify', context: content || file?.name || '' }),
      });
      if (!response.ok) throw new Error('Classification failed');
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setForm((prev) => ({
        ...prev,
        doc_type: data.doc_type || prev.doc_type,
        document_number: data.document_number || prev.document_number,
        authority: data.authority || prev.authority,
        keywords: Array.isArray(data.keywords) ? data.keywords.join(', ') : prev.keywords,
      }));
      setAiSuggested(true);
      toast.success(t('aiClassified'));
    } catch {
      toast.error(t('aiNotConfiguredDesc'));
    } finally {
      setClassifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let filePath: string | null = null;
      let contentText: string | null = null;
      let hash = '';
      let docType = form.doc_type;

      if (mode === 'file' && file) {
        const ext = file.name.split('.').pop() ?? 'bin';
        filePath = `${profile?.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
        if (upErr) {
          toast.error(t('uploadError'));
          setSaving(false);
          return;
        }
        hash = await sha256(`${file.name}:${file.size}`);
        if (!docType) docType = ext.toUpperCase();
      } else if (mode === 'text') {
        contentText = textContent;
        hash = await sha256(textContent);
        if (!docType) docType = 'Text';
      } else if (mode === 'scan') {
        contentText = scannedText;
        hash = await sha256(scannedText);
        if (!docType) docType = 'Scanned';
        if (file) {
          const ext = file.name.split('.').pop() ?? 'bin';
          filePath = `${profile?.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file);
          if (upErr) {
            toast.error(t('uploadError'));
            setSaving(false);
            return;
          }
        }
      }

      const { error } = await supabase.from('documents').insert({
        file_name: form.file_name || (file?.name ?? 'Untitled'),
        file_path: filePath,
        content_text: contentText,
        type: mode === 'text' ? 'text' : 'file',
        category_id: form.category_id || null,
        person_id: form.person_id || null,
        uploaded_by: profile?.id,
        content_hash: hash,
        classification: form.classification,
        doc_type: docType || null,
        document_date: form.document_date || null,
        keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        notes: form.notes || null,
        document_number: form.document_number || null,
        retention_years: Number(form.retention_years),
        expiry_date: computedExpiry || null,
        authority: form.authority || null,
        department: form.department || null,
      });

      if (error) {
        toast.error(t('saveError'));
      } else {
        toast.success(t('saveSuccess'));
        navigate('/documents');
      }
    } finally {
      setSaving(false);
    }
  };

  const steps = [t('uploadStep1'), t('uploadStep2'), t('uploadStep3')];

  const modeTabs: { key: UploadMode; icon: typeof FileUp; label: string }[] = [
    { key: 'file', icon: FileUp, label: t('file') },
    { key: 'text', icon: Type, label: t('text') },
    { key: 'scan', icon: ScanText, label: t('ocr') },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('uploadTitle')}</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
              step === i + 1
                ? 'bg-accent text-white'
                : step > i + 1
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
              {step > i + 1 ? <Check size={16} /> : <span className="w-5 h-5 flex items-center justify-center rounded-full text-xs">{i + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select */}
      {step === 1 && (
        <Card className="animate-fade-in">
          <div className="space-y-4">
            {/* 3-mode tabs */}
            <div className="flex gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/50">
              {modeTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setMode(tab.key); setFile(null); setScannedText(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                    mode === tab.key ? 'bg-white dark:bg-gray-700 text-accent shadow-sm' : 'text-gray-500'
                  }`}
                >
                  <tab.icon size={18} /> {tab.label}
                </button>
              ))}
            </div>

            {mode === 'file' && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById('file-input')?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition"
              >
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 rounded-xl bg-accent/10 text-accent">
                      <FileText size={32} />
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-red-500 hover:text-red-600 text-sm">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800">
                      <UploadIcon size={32} />
                    </div>
                    <p className="text-sm">{t('dragDropHere')}</p>
                    <p className="text-xs text-gray-400">PDF / Word / Excel / Image</p>
                  </div>
                )}
                <input id="file-input" type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
              </div>
            )}

            {mode === 'text' && (
              <div className="space-y-3">
                <Input
                  label={t('documentName')}
                  value={form.file_name}
                  onChange={(e) => setForm({ ...form, file_name: e.target.value })}
                  placeholder={t('documentName')}
                />
                <Textarea
                  label={t('textContent')}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={t('textContent')}
                  className="min-h-[200px]"
                />
              </div>
            )}

            {mode === 'scan' && (
              <div className="space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => document.getElementById('scan-input')?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition"
                >
                  {file ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-xl bg-accent/10 text-accent">
                        <ImageIcon size={32} />
                      </div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      <button onClick={(e) => { e.stopPropagation(); setFile(null); setScannedText(''); }} className="text-red-500 hover:text-red-600 text-sm">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800">
                        <ScanText size={32} />
                      </div>
                      <p className="text-sm">{t('ocrUpload')}</p>
                    </div>
                  )}
                  <input id="scan-input" type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
                </div>

                {file && (
                  <Button onClick={handleScan} disabled={scanning} variant="ghost" className="w-full">
                    {scanning ? <Spinner /> : <><ScanText size={18} /> {t('extractText')}</>}
                  </Button>
                )}

                {scannedText && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">{t('ocrResult')}</p>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {scannedText}
                    </div>
                  </div>
                )}

                <Input
                  label={t('documentName')}
                  value={form.file_name}
                  onChange={(e) => setForm({ ...form, file_name: e.target.value })}
                  placeholder={t('documentName')}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => { checkDuplicate(); setStep(2); }}
                disabled={
                  (mode === 'file' && !file) ||
                  (mode === 'text' && !textContent.trim()) ||
                  (mode === 'scan' && !file)
                }
              >
                {t('next')} <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <Card className="animate-fade-in">
          <div className="space-y-4">
            {duplicateWarning && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
                <AlertTriangle size={16} />
                {t('duplicateWarning')}
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-xl bg-accent/5 border border-accent/20">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Sparkles size={16} className="text-accent" />
                {aiSuggested ? t('aiClassified') : t('aiClassifyHint')}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleClassify()} disabled={classifying}>
                {classifying ? <Spinner /> : <><Sparkles size={14} /> {t('autoClassify')}</>}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('documentName')} value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} />
              <Input label={t('documentNumber')} value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
              <Select label={t('classification')} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value as Classification })}>
                {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <Select label={t('category')} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select label={t('person')} value={form.person_id} onChange={(e) => setForm({ ...form, person_id: e.target.value })}>
                <option value="">—</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
              <Input label={t('docType')} value={form.doc_type} onChange={(e) => setForm({ ...form, doc_type: e.target.value })} placeholder={t('docTypePlaceholder')} />
              {aiSuggested && <Badge className="bg-accent/10 text-accent">{t('aiSuggested')}</Badge>}
              <Input label={t('authority')} value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} />
              <Input label={t('docDepartment')} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <Input type="date" label={t('documentDate')} value={form.document_date} onChange={(e) => setForm({ ...form, document_date: e.target.value })} />
              <Input type="number" min={1} max={10} label={t('retentionPeriod')} value={form.retention_years} onChange={(e) => setForm({ ...form, retention_years: Number(e.target.value) })} />
            </div>
            <Input label={t('keywords')} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
            <Textarea label={t('notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            {computedExpiry && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {t('autoExpiry')}: {computedExpiry}
                </Badge>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft size={16} /> {t('back')}
              </Button>
              <Button onClick={() => setStep(3)}>
                {t('next')} <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Review & Save */}
      {step === 3 && (
        <Card className="animate-fade-in">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('uploadStep3')}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <ReviewField label={t('documentName')} value={form.file_name} />
              <ReviewField label={t('classification')} value={form.classification} badge={classificationColor(form.classification)} />
              <ReviewField label={t('category')} value={categories.find((c) => c.id === form.category_id)?.name ?? '—'} />
              <ReviewField label={t('person')} value={people.find((p) => p.id === form.person_id)?.name ?? '—'} />
              <ReviewField label={t('authority')} value={form.authority || '—'} />
              <ReviewField label={t('docDepartment')} value={form.department || '—'} />
              <ReviewField label={t('documentDate')} value={form.document_date || '—'} />
              <ReviewField label={t('retentionPeriod')} value={`${form.retention_years} yrs`} />
              <ReviewField label={t('expiryDate')} value={computedExpiry || '—'} />
              <ReviewField label={t('type')} value={mode} />
            </div>
            {form.keywords && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('keywords')}</p>
                <div className="flex flex-wrap gap-1">
                  {form.keywords.split(',').map((k, i) => (
                    <Badge key={i} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{k.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}
            {form.notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('notes')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{form.notes}</p>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ChevronLeft size={16} /> {t('back')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Spinner /> : <><Check size={16} /> {t('save')}</>}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReviewField({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      {badge ? (
        <Badge className={badge}>{value}</Badge>
      ) : (
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
      )}
    </div>
  );
}

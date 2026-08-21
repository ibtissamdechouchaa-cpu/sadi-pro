import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Send, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n-context';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import type { DocumentRow } from '@/lib/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  confidence?: number;
}

export function AIChatPage() {
  const { t } = useI18n();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('documents')
      .select('id, file_name, content_text')
      .not('content_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setDocs((data as DocumentRow[]) ?? []);
        setLoadingDocs(false);
      });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setSending(true);

    try {
      const doc = docs.find((d) => d.id === selectedDoc);
      const context = doc?.content_text ?? '';

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sadi-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'chat',
          question: userMsg,
          context,
          docName: doc?.file_name,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer ?? data.content ?? 'No response',
          citations: data.citations ?? (doc ? [doc.file_name] : []),
          confidence: data.confidence,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('aiNotConfiguredDesc'),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('aiChatTitle')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('aiChatDesc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document selector */}
        <Card className="lg:col-span-1 h-fit">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('selectDocument')}</h3>
          {loadingDocs ? (
            <InlineSpinner />
          ) : docs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">{t('noDocuments')}</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              <button
                onClick={() => setSelectedDoc('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  selectedDoc === '' ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {t('all')}
              </button>
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDoc(d.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                    selectedDoc === d.id ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">{d.file_name}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Chat area */}
        <Card className="lg:col-span-3 flex flex-col h-[600px] p-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 rounded-2xl bg-accent/10 text-accent mb-4">
                  <Sparkles size={32} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('noMessages')}</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-accent text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                        <p className="text-xs font-medium opacity-70 mb-1">{t('sourceCitations')}:</p>
                        {msg.citations.map((c, j) => (
                          <p key={j} className="text-xs opacity-60">{c}</p>
                        ))}
                      </div>
                    )}
                    {msg.confidence !== undefined && (
                      <Badge className="mt-2 bg-white/20 text-white">{t('confidence')}: {Math.round(msg.confidence * 100)}%</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-3">
                  <Spinner className="text-gray-400" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={t('askQuestion')}
                className="input-base flex-1"
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={sending || !input.trim()}>
                {sending ? <Spinner /> : <Send size={18} />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function InlineSpinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <Spinner className="text-accent" />
    </div>
  );
}

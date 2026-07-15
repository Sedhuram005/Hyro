import { useEffect, useState, useRef } from 'react';
import {
  Brain,
  Send,
  Sparkles,
  CheckCircle,
  User,
  Bot,
  Loader2,
  Calendar,
  Package,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  RotateCcw,
  Save,
  Pencil,
  Lightbulb,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HCP, Product, ExtractedInteraction, NavigateFn, EditTarget } from '../lib/types';
import Badge from '../components/Badge';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  extracted?: ExtractedInteraction;
}

const INTEREST_LEVELS = ['high', 'medium', 'low', 'neutral'] as const;

interface LogInteractionProps {
  onNavigate: NavigateFn;
  editTarget?: EditTarget | null;
}

export default function LogInteraction({ onNavigate, editTarget }: LogInteractionProps) {
  const isEditing = !!editTarget;

  const [hcps, setHcps] = useState<HCP[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: isEditing
      ? "I've loaded the existing interaction. Tell me what to change — for example: \"Change the hospital to Ruby Hall Clinic and update interest to high. Add 10 samples.\""
      : "Hi! I'm your AI meeting assistant. Type a prompt describing your visit and I'll fill the entire form automatically.\n\nExample: \"I met Dr. Ravi at Apollo Hospital today. We discussed CardioPlus and GlucoBalance. He showed strong interest and I gave him 5 sample packs. Follow up next Tuesday.\"",
  }]);
  const [input, setInput] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedInteraction | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    hcp_id: '',
    hospital: '',
    visit_date: new Date().toISOString().split('T')[0],
    products_discussed: [] as string[],
    samples_given: 0,
    feedback: '',
    interest_level: 'neutral' as 'high' | 'medium' | 'low' | 'neutral',
    follow_up_date: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('hcps').select('*').order('name'),
      supabase.from('products').select('*').order('name'),
    ]).then(([hcpResult, productResult]) => {
      if (hcpResult.data) setHcps(hcpResult.data);
      if (productResult.data) setProducts(productResult.data);
    });
  }, []);

  useEffect(() => {
    if (!editTarget) return;
    setLoadingEdit(true);
    supabase
      .from('interactions')
      .select('*')
      .eq('id', editTarget.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setSaveError('Could not load interaction for editing.');
          setLoadingEdit(false);
          return;
        }
        setFormData({
          hcp_id: data.hcp_id ?? '',
          hospital: data.hospital ?? '',
          visit_date: data.visit_date ?? new Date().toISOString().split('T')[0],
          products_discussed: data.products_discussed ?? [],
          samples_given: data.samples_given ?? 0,
          feedback: data.feedback ?? '',
          interest_level: data.interest_level ?? 'neutral',
          follow_up_date: data.follow_up_date ?? '',
          notes: data.notes ?? '',
        });
        setLoadingEdit(false);
      });
  }, [editTarget]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function buildCurrentDataForAI() {
    const hcp = hcps.find(h => h.id === formData.hcp_id);
    return {
      hcp_name: hcp?.name ?? null,
      hospital: formData.hospital || null,
      visit_date: formData.visit_date || null,
      products_discussed: formData.products_discussed,
      samples_given: formData.samples_given,
      feedback: formData.feedback || null,
      interest_level: formData.interest_level,
      follow_up_date: formData.follow_up_date || null,
      notes: formData.notes || null,
    };
  }

  async function handleAISend() {
    if (!input.trim() || extracting) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMessage }]);
    setExtracting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-interaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            conversation: userMessage,
            known_products: products.map(p => p.name),
            current_data: buildCurrentDataForAI(),
          }),
        }
      );

      if (!response.ok) throw new Error(`Extraction failed (${response.status})`);
      const data: ExtractedInteraction = await response.json();

      if (data.hcp_name) {
        const match = hcps.find(h =>
          h.name.toLowerCase().includes(data.hcp_name!.toLowerCase().replace('dr. ', '').replace('dr ', '')) ||
          data.hcp_name!.toLowerCase().includes(h.name.toLowerCase().replace('dr. ', ''))
        );
        if (match) setFormData(f => ({ ...f, hcp_id: match.id }));
      }

      setExtracted(data);
      setFormData(f => ({
        ...f,
        hospital: data.hospital ?? f.hospital,
        visit_date: data.visit_date ?? f.visit_date,
        products_discussed: data.products_discussed.length > 0 ? data.products_discussed : f.products_discussed,
        samples_given: data.samples_given > 0 ? data.samples_given : f.samples_given,
        feedback: data.feedback ?? f.feedback,
        interest_level: data.interest_level ?? f.interest_level,
        follow_up_date: data.follow_up_date ?? f.follow_up_date,
        notes: data.notes ?? f.notes,
      }));

      const summaryMsg = buildSummaryMessage(data, isEditing);
      setMessages(m => [...m, { role: 'assistant', content: summaryMsg, extracted: data }]);
    } catch {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'I had trouble extracting the details. Please try rephrasing your prompt.',
      }]);
    } finally {
      setExtracting(false);
    }
  }

  function buildSummaryMessage(data: ExtractedInteraction, editing: boolean): string {
    const lines = [editing
      ? "Done! I've updated the form based on your prompt. Here's what changed:"
      : "I've filled the form from your prompt. Here's what I extracted:"];
    if (data.hcp_name) lines.push(`• Doctor: ${data.hcp_name}`);
    if (data.hospital) lines.push(`• Hospital: ${data.hospital}`);
    if (data.visit_date) lines.push(`• Visit Date: ${new Date(data.visit_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`);
    if (data.products_discussed.length > 0) lines.push(`• Products: ${data.products_discussed.join(', ')}`);
    if (data.samples_given > 0) lines.push(`• Samples Given: ${data.samples_given} packs`);
    if (data.interest_level) lines.push(`• Interest Level: ${data.interest_level.charAt(0).toUpperCase() + data.interest_level.slice(1)}`);
    if (data.follow_up_date) lines.push(`• Follow-up: ${new Date(data.follow_up_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`);
    lines.push('');
    lines.push(editing
      ? 'The form on the right shows the updated details. Type another prompt to make more changes, or save when ready.'
      : 'The form on the right is filled in. Type another prompt to add or change anything, or save when ready.');
    return lines.join('\n');
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');

    const payload: Record<string, unknown> = {
      hcp_id: formData.hcp_id || null,
      hospital: formData.hospital || null,
      visit_date: formData.visit_date,
      products_discussed: formData.products_discussed,
      samples_given: formData.samples_given,
      feedback: formData.feedback || null,
      interest_level: formData.interest_level,
      follow_up_date: formData.follow_up_date || null,
      notes: formData.notes || null,
      created_via: 'ai',
    };

    if (extracted) {
      payload.ai_summary = extracted.ai_summary;
      payload.sentiment = extracted.sentiment;
      payload.next_action = extracted.next_action;
      payload.raw_conversation = messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n');
    }

    let error;
    if (isEditing && editTarget) {
      ({ error } = await supabase.from('interactions').update(payload).eq('id', editTarget.id));
    } else {
      ({ error } = await supabase.from('interactions').insert(payload));
    }

    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  function resetAI() {
    setMessages([{
      role: 'assistant',
      content: isEditing
        ? "I've loaded the existing interaction. Tell me what to change — for example: \"Change the hospital to Ruby Hall Clinic and update interest to high. Add 10 samples.\""
        : "Hi! I'm your AI meeting assistant. Type a prompt describing your visit and I'll fill the entire form automatically.\n\nExample: \"I met Dr. Ravi at Apollo Hospital today. We discussed CardioPlus and GlucoBalance. He showed strong interest and I gave him 5 sample packs. Follow up next Tuesday.\"",
    }]);
    setExtracted(null);
    setInput('');
    if (!isEditing) {
      setFormData({
        hcp_id: '',
        hospital: '',
        visit_date: new Date().toISOString().split('T')[0],
        products_discussed: [],
        samples_given: 0,
        feedback: '',
        interest_level: 'neutral',
        follow_up_date: '',
        notes: '',
      });
    }
    setSaved(false);
    setSaveError('');
  }

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {isEditing ? 'Interaction Updated!' : 'Interaction Saved!'}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {isEditing
              ? 'The interaction has been successfully updated in the CRM.'
              : 'The interaction has been successfully logged to the CRM.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {!isEditing && (
              <button
                onClick={resetAI}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" /> Log Another
              </button>
            )}
            <button
              onClick={() => onNavigate('interactions')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-sm font-medium"
            >
              View History <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          {isEditing && <Pencil className="w-5 h-5 text-emerald-500" />}
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing ? 'Edit Interaction' : 'Log Interaction'}
          </h1>
          {isEditing && <Badge value="Editing" variant="ai" />}
        </div>
        <p className="text-slate-500 text-sm mt-1">
          {isEditing
            ? 'Type a prompt to tell the AI what to change — the form updates automatically'
            : 'Type a prompt describing your visit and the AI fills the entire form for you'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Chat Panel */}
        <div className="flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: 640 }}>
          {/* Chat Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">AI Prompt Assistant</p>
                <p className="text-xs text-slate-500">
                  {isEditing ? 'Edit mode — type what to change' : 'Type a prompt to fill the form'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-500">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === 'user' ? 'bg-emerald-600' : 'bg-slate-200'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-slate-600" />
                  }
                </div>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.extracted && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.extracted.sentiment && (
                        <Badge value={msg.extracted.sentiment} variant={msg.extracted.sentiment} />
                      )}
                      {msg.extracted.interest_level && (
                        <Badge value={`${msg.extracted.interest_level} interest`} variant={msg.extracted.interest_level} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {extracting && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-slate-600" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                  <span className="text-sm text-slate-500">
                    {isEditing ? 'Updating form from prompt...' : 'Filling form from prompt...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Prompt Input */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAISend(); } }}
                placeholder={isEditing ? "Type what to change... e.g. 'Change hospital to Ruby Hall and set interest to high'" : "Type your prompt... e.g. 'Met Dr. Ravi at Apollo today, discussed CardioPlus, high interest, 5 samples'"}
                rows={2}
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleAISend}
                disabled={!input.trim() || extracting}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Quick prompt suggestions */}
            <div className="mt-2.5">
              <p className="text-xs text-slate-400 flex items-center gap-1 mb-1.5">
                <Lightbulb className="w-3 h-3" /> Try a prompt:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(isEditing ? [
                  'Change hospital to Ruby Hall Clinic and set interest to high.',
                  'Update samples to 15 and add follow-up next Monday.',
                  'Switch doctor to Dr. Priya and add OncoClear to products.',
                ] : [
                  'I met Dr. Ravi today at Apollo Hospital. Discussed CardioPlus, showed high interest. Gave 5 samples. Follow up next Tuesday.',
                  'Visited Dr. Priya at Fortis. She wants more clinical data on OncoClear before prescribing. Low interest, no samples.',
                  'Met Dr. Sharma at Max Healthcare. Discussed NeuroCare and BreathEasy. Medium interest, 3 sample packs. Follow up in 2 weeks.',
                ]).map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="text-xs px-2.5 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors text-left max-w-full truncate"
                  >
                    {prompt.length > 55 ? prompt.substring(0, 55) + '...' : prompt}
                  </button>
                ))}
              </div>
            </div>

            {extracted && (
              <button
                onClick={resetAI}
                className="mt-2 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Start over
              </button>
            )}
          </div>
        </div>

        {/* Form Preview Panel (read-only, filled by AI) */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ height: 640 }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <h2 className="font-semibold text-slate-900">
                {isEditing ? 'Updated Details' : 'Form Preview'}
              </h2>
            </div>
            {extracted && <Badge value={isEditing ? 'AI Updated' : 'AI Filled'} variant="ai" />}
          </div>

          {!extracted && !isEditing ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-8">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                <Brain className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-slate-500 text-sm mb-2">Waiting for your prompt...</p>
              <p className="text-slate-400 text-xs">
                Type a description of your meeting in the chat and the AI will fill this form automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto h-full">
              <FormPreview
                formData={formData}
                hcps={hcps}
                products={products}
                extracted={extracted}
              />
              <div className="px-5 pb-5">
                {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
                <button
                  onClick={handleSave}
                  disabled={saving || !extracted}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEditing ? 'Update Interaction' : 'Save Interaction'}
                </button>
                {!extracted && isEditing && (
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Type a prompt to make changes, then save.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Read-only form preview filled by AI
interface FormPreviewProps {
  formData: {
    hcp_id: string;
    hospital: string;
    visit_date: string;
    products_discussed: string[];
    samples_given: number;
    feedback: string;
    interest_level: 'high' | 'medium' | 'low' | 'neutral';
    follow_up_date: string;
    notes: string;
  };
  hcps: HCP[];
  products: Product[];
  extracted?: ExtractedInteraction | null;
}

function FormPreview({ formData, hcps, products, extracted }: FormPreviewProps) {
  const hcp = hcps.find(h => h.id === formData.hcp_id);

  return (
    <div className="px-5 py-5 space-y-5">
      {/* AI Summary */}
      {extracted?.ai_summary && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">AI Summary</p>
          </div>
          <p className="text-sm text-emerald-900 leading-relaxed">{extracted.ai_summary}</p>
          {extracted.next_action && (
            <div className="mt-3 flex items-start gap-2">
              <ArrowRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 font-medium">{extracted.next_action}</p>
            </div>
          )}
        </div>
      )}

      {/* Doctor */}
      <FieldPreview
        icon={<User className="w-3.5 h-3.5 text-slate-400" />}
        label="Healthcare Professional"
        value={hcp ? `${hcp.name} — ${hcp.specialty}` : 'Not specified'}
        empty={!hcp}
      />

      {/* Hospital + Date */}
      <div className="grid grid-cols-2 gap-3">
        <FieldPreview
          icon={<MessageSquare className="w-3.5 h-3.5 text-slate-400" />}
          label="Hospital / Clinic"
          value={formData.hospital || 'Not specified'}
          empty={!formData.hospital}
        />
        <FieldPreview
          icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
          label="Visit Date"
          value={formData.visit_date ? new Date(formData.visit_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Not specified'}
          empty={!formData.visit_date}
        />
      </div>

      {/* Products */}
      <div>
        <p className="text-xs font-medium text-slate-700 mb-2">
          <Package className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />Products Discussed
        </p>
        {formData.products_discussed.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {formData.products_discussed.map(name => (
              <span key={name} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">Not specified</p>
        )}
      </div>

      {/* Samples + Interest */}
      <div className="grid grid-cols-2 gap-3">
        <FieldPreview
          label="Samples Given"
          value={formData.samples_given > 0 ? `${formData.samples_given} packs` : 'None'}
          empty={formData.samples_given === 0}
        />
        <div>
          <p className="text-xs font-medium text-slate-700 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />Interest Level
          </p>
          <div className="flex gap-1.5">
            {INTEREST_LEVELS.map(level => (
              <span
                key={level}
                className={`flex-1 py-2 rounded-lg text-xs font-medium border text-center capitalize ${
                  formData.interest_level === level
                    ? level === 'high' ? 'bg-emerald-500 text-white border-emerald-500'
                    : level === 'medium' ? 'bg-amber-500 text-white border-amber-500'
                    : level === 'low' ? 'bg-red-500 text-white border-red-500'
                    : 'bg-slate-500 text-white border-slate-500'
                    : 'bg-slate-50 text-slate-300 border-slate-100'
                }`}
              >
                {level}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback */}
      <FieldPreview
        label="Doctor's Feedback"
        value={formData.feedback || 'Not specified'}
        empty={!formData.feedback}
        multiline
      />

      {/* Follow-up + Notes */}
      <div className="grid grid-cols-2 gap-3">
        <FieldPreview
          icon={<Calendar className="w-3.5 h-3.5 text-slate-400" />}
          label="Follow-up Date"
          value={formData.follow_up_date ? new Date(formData.follow_up_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Not scheduled'}
          empty={!formData.follow_up_date}
        />
        <FieldPreview
          label="Additional Notes"
          value={formData.notes || 'None'}
          empty={!formData.notes}
        />
      </div>
    </div>
  );
}

function FieldPreview({ icon, label, value, empty, multiline }: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  empty?: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-700 mb-1.5">
        {icon}{icon && ' '}{label}
      </p>
      <div className={`px-3 py-2.5 rounded-xl border text-sm ${
        empty
          ? 'bg-slate-50 border-slate-100 text-slate-400 italic'
          : 'bg-white border-slate-200 text-slate-800'
      } ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {value}
      </div>
    </div>
  );
}

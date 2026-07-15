import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Building2,
  Stethoscope,
  X,
  Edit2,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HCP, NavigateFn } from '../lib/types';

interface HCPsProps {
  onNavigate: NavigateFn;
}

const SPECIALTIES = [
  'Cardiologist', 'Oncologist', 'Diabetologist', 'Pulmonologist',
  'Neurologist', 'Rheumatologist', 'Gastroenterologist', 'Nephrologist',
  'Endocrinologist', 'General Physician',
];

const BLANK_HCP = {
  name: '', specialty: '', hospital: '', city: '', phone: '', email: '', notes: '',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function HCPs(_props: HCPsProps) {
  const [hcps, setHcps] = useState<HCP[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingHCP, setEditingHCP] = useState<HCP | null>(null);
  const [form, setForm] = useState(BLANK_HCP);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadHCPs(); }, []);

  async function loadHCPs() {
    setLoading(true);
    const { data } = await supabase.from('hcps').select('*').order('name');
    if (data) setHcps(data);
    setLoading(false);
  }

  function openAdd() {
    setEditingHCP(null);
    setForm(BLANK_HCP);
    setError('');
    setShowModal(true);
  }

  function openEdit(hcp: HCP) {
    setEditingHCP(hcp);
    setForm({
      name: hcp.name,
      specialty: hcp.specialty ?? '',
      hospital: hcp.hospital ?? '',
      city: hcp.city ?? '',
      phone: hcp.phone ?? '',
      email: hcp.email ?? '',
      notes: hcp.notes ?? '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      specialty: form.specialty || null,
      hospital: form.hospital || null,
      city: form.city || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
    };
    const { error: err } = editingHCP
      ? await supabase.from('hcps').update(payload).eq('id', editingHCP.id)
      : await supabase.from('hcps').insert(payload);

    if (err) { setError(err.message); } else { setShowModal(false); loadHCPs(); }
    setSaving(false);
  }

  const filtered = hcps.filter(h =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.specialty ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (h.hospital ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (h.city ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const specialtyColors: Record<string, string> = {
    Cardiologist: 'bg-red-100 text-red-700',
    Oncologist: 'bg-purple-100 text-purple-700',
    Diabetologist: 'bg-emerald-100 text-emerald-700',
    Pulmonologist: 'bg-cyan-100 text-cyan-700',
    Neurologist: 'bg-amber-100 text-amber-700',
    Rheumatologist: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Healthcare Professionals</h1>
          <p className="text-slate-500 text-sm mt-1">{hcps.length} total HCPs in your network</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add HCP
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, specialty, hospital or city..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{search ? 'No HCPs match your search.' : 'No HCPs yet. Add your first one!'}</p>
          {!search && (
            <button onClick={openAdd} className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Add HCP
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(hcp => (
            <div key={hcp.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-emerald-600">
                      {hcp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{hcp.name}</p>
                    {hcp.specialty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${specialtyColors[hcp.specialty] ?? 'bg-slate-100 text-slate-600'}`}>
                        {hcp.specialty}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(hcp)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {hcp.hospital && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{hcp.hospital}</span>
                  </div>
                )}
                {hcp.city && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{hcp.city}</span>
                  </div>
                )}
                {hcp.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{hcp.phone}</span>
                  </div>
                )}
                {hcp.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{hcp.email}</span>
                  </div>
                )}
              </div>

              {hcp.notes && (
                <p className="mt-3 text-xs text-slate-400 line-clamp-2 border-t border-slate-50 pt-3">{hcp.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-500" />
                <h2 className="font-semibold text-slate-900">{editingHCP ? 'Edit HCP' : 'Add Healthcare Professional'}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Dr. First Last"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Specialty</label>
                    <select
                      value={form.specialty}
                      onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="">Select...</option>
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">City</label>
                    <input
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Mumbai"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Hospital / Clinic</label>
                  <input
                    value={form.hospital}
                    onChange={e => setForm(f => ({ ...f, hospital: e.target.value }))}
                    placeholder="Apollo Hospital"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                    <input
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="doctor@hospital.com"
                      type="email"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any additional notes about this HCP..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-60"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingHCP ? 'Save Changes' : 'Add HCP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useForm } from 'react-hook-form';
import { incidentsApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function IncidentForm({ incident, mines = [], onSave, onCancel }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: incident || { incident_date: new Date().toISOString().slice(0, 16), injuries_count: 0, fatalities_count: 0 }
  });
  const isEdit = !!incident?.id;

  const onSubmit = async (data) => {
    try {
      if (isEdit) { await incidentsApi.update(incident.id, data); toast.success('Incident updated'); }
      else { await incidentsApi.create(data); toast.success('Incident reported'); }
      onSave();
    } catch {}
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {!isEdit && <>
          <div className="form-group">
            <label className="label">Mine *</label>
            <select {...register('mine_id', { required: true })} className="select">
              <option value="">Select Mine</option>
              {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Incident Type *</label>
            <select {...register('type', { required: true })} className="select">
              <option value="">Select Type</option>
              {['Roof Fall','Gas Ignition','Inundation','Slope Failure','Equipment Failure','Fire','Explosion','Electrical','Near Miss','Other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Severity *</label>
            <select {...register('severity', { required: true })} className="select">
              <option value="">Select Severity</option>
              {['fatal','serious','minor','near_miss'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Category</label>
            <input {...register('category')} className="input" placeholder="Ground Control, Gas Hazard..." />
          </div>
          <div className="form-group col-span-2">
            <label className="label">Date & Time *</label>
            <input type="datetime-local" {...register('incident_date', { required: true })} className="input" />
          </div>
        </>}
        <div className="form-group">
          <label className="label">Injuries Count</label>
          <input type="number" {...register('injuries_count')} className="input" min="0" />
        </div>
        <div className="form-group">
          <label className="label">Fatalities Count</label>
          <input type="number" {...register('fatalities_count')} className="input" min="0" />
        </div>
        {!isEdit && (
          <div className="form-group col-span-2">
            <label className="label">Location in Mine</label>
            <input {...register('location_in_mine')} className="input" placeholder="Seam 14, Gallery C, Level 3" />
          </div>
        )}
        {!isEdit && (
          <div className="form-group col-span-2">
            <label className="label">Description *</label>
            <textarea {...register('description', { required: true })} rows={3} className="input resize-none" />
          </div>
        )}
        {isEdit && <>
          <div className="form-group col-span-2">
            <label className="label">Status</label>
            <select {...register('status')} className="select">
              {['open','under_investigation','closed','reported_to_dgms'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div className="form-group col-span-2">
            <label className="label">Root Cause Analysis</label>
            <textarea {...register('root_cause')} rows={3} className="input resize-none" />
          </div>
          <div className="form-group col-span-2">
            <label className="label">Corrective Measures</label>
            <textarea {...register('corrective_measures')} rows={3} className="input resize-none" />
          </div>
        </>}
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Incident' : 'Report Incident'}
        </button>
      </div>
    </form>
  );
}

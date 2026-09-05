import { useForm } from 'react-hook-form';
import { minesApi } from '../../services/api';
import toast from 'react-hot-toast';
import { MINE_STATES } from '../../utils/helpers';

export default function MineForm({ mine, onSave, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: mine || {} });

  const onSubmit = async (data) => {
    try {
      if (mine?.id) {
        await minesApi.update(mine.id, data);
        toast.success('Mine updated successfully');
      } else {
        await minesApi.create(data);
        toast.success('Mine added successfully');
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save mine');
    }
  };

  const Field = ({ name, label, required, type = 'text', options, ...rest }) => (
    <div className="form-group">
      <label className="label">{label}{required && ' *'}</label>
      {options ? (
        <select {...register(name, required ? { required: `${label} required` } : {})} className="select" {...rest}>
          <option value="">Select {label}</option>
          {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
        </select>
      ) : (
        <input type={type} {...register(name, required ? { required: `${label} required` } : {})} className="input" {...rest} />
      )}
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field name="mine_id" label="Mine ID" required placeholder="MN-JH-001" />
        <Field name="name" label="Mine Name" required placeholder="Jharia Central Coal Mine" />
        <Field name="type" label="Mine Type" required options={[{value:'Underground',label:'Underground'},{value:'Opencast',label:'Opencast'},{value:'Mixed',label:'Mixed'}]} />
        <Field name="status" label="Status" options={[{value:'active',label:'Active'},{value:'inactive',label:'Inactive'},{value:'suspended',label:'Suspended'},{value:'under_inspection',label:'Under Inspection'}]} />
        <Field name="owner_name" label="Owner Name" required />
        <Field name="owner_company" label="Company Name" required />
        <Field name="state" label="State" required options={MINE_STATES} />
        <Field name="district" label="District" required />
        <Field name="location_name" label="Location / Coalfield" required />
        <Field name="contact_email" label="Contact Email" type="email" />
        <Field name="contact_phone" label="Contact Phone" />
        <Field name="workers_count" label="Workers Count" type="number" />
        <Field name="area_hectares" label="Area (Hectares)" type="number" step="0.01" />
        <Field name="depth_meters" label="Depth (Meters)" type="number" />
        <Field name="production_capacity_mt" label="Production Capacity (MT)" type="number" />
        <Field name="established_year" label="Established Year" type="number" />
        <Field name="mining_method" label="Mining Method" placeholder="Bord and Pillar / Longwall / Shovel-Dumper" />
        <Field name="license_number" label="License Number" />
        <Field name="license_expiry" label="License Expiry" type="date" />
        <Field name="latitude" label="Latitude" type="number" step="0.000001" />
        <Field name="longitude" label="Longitude" type="number" step="0.000001" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Saving...' : mine ? 'Update Mine' : 'Create Mine'}
        </button>
      </div>
    </form>
  );
}

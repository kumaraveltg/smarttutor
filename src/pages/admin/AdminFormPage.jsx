import { useParams } from 'react-router-dom'
import { entities } from '../../config/entities'
import CrudForm from '../../components/admin/CrudForm'

export default function AdminFormPage() {
  const { entityKey } = useParams()
  const entity = entities[entityKey]
  if (!entity) return <p className="text-slate-400">Unknown section.</p>
  return <CrudForm entityKey={entityKey} entity={entity} />
}

import { useParams } from 'react-router-dom'
import { entities } from '../../config/entities'
import CrudTable from '../../components/admin/CrudTable'

export default function AdminListPage() {
  const { entityKey } = useParams()
  const entity = entities[entityKey]
  if (!entity) return <p className="text-slate-400">Unknown section.</p>
  return <CrudTable entityKey={entityKey} entity={entity} />
}

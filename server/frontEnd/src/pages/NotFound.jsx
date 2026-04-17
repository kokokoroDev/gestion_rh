import { useNavigate } from 'react-router-dom'
import usePageTitle from '@/hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Skatys - Not Found')
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 text-center p-8">
      <p className="text-8xl font-bold text-surface-200 font-mono">404</p>
      <h1 className="text-xl font-semibold text-surface-700 mt-4">Page introuvable</h1>
      <p className="text-sm text-surface-400 mt-2 mb-6">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <button onClick={() => navigate('/dashboard')} className="btn-primary">
        Retour au tableau de bord
      </button>
    </div>
  )
}
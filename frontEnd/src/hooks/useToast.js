import { useDispatch } from 'react-redux'
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/store/slices/uiSlice'

export const useToast = () => {
  const dispatch = useDispatch()
  return {
    success: (msg) => dispatch(toastSuccess(msg)),
    error:   (msg) => dispatch(toastError(msg)),
    info:    (msg) => dispatch(toastInfo(msg)),
    warning: (msg) => dispatch(toastWarning(msg)),
  }
}
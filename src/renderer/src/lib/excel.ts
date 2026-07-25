import { toast } from 'sonner'
import { errText } from './format'

export interface ExportReq {
  defaultName: string
  headers: string[]
  rows: (string | number)[][]
  subtotalCols?: number[]
  summary?: { label: string; value: string }[]
}

export async function exportExcel(req: ExportReq): Promise<void> {
  try {
    const res = await window.api.excel.export(req)
    if (res.ok) toast.success(res.message)
    else toast.message(res.message)
  } catch (e) {
    toast.error(errText(e))
  }
}

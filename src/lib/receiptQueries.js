import { useMutation } from '@tanstack/react-query'
import { supabase } from './supabaseClient.js'
import { useSession } from './session.jsx'

/**
 * Uploads a receipt image (or sends pasted text) for parsing.
 *
 * The image goes to a private bucket under the workspace's own folder, which
 * is what the Storage policies key off. The Edge Function holds the API key
 * and re-checks both consent and the folder before reading anything.
 */
export function useParseReceipt() {
  const { workspace } = useSession()

  return useMutation({
    mutationFn: async ({ file, text }) => {
      let storagePath = null

      if (file) {
        const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
        storagePath = `${workspace.id}/${crypto.randomUUID()}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(storagePath, file, { contentType: file.type, upsert: false })
        if (uploadError) throw uploadError
      }

      const { data, error } = await supabase.functions.invoke('parse-receipt', {
        body: { storage_path: storagePath, text: text || null, consented: true },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      return { ...data, storagePath }
    },
  })
}

/**
 * Removes an uploaded receipt. Used when the user abandons a parse — there is
 * no reason to keep a photo of someone's purchase they decided not to use.
 */
export async function deleteReceipt(storagePath) {
  if (!storagePath) return
  await supabase.storage.from('receipts').remove([storagePath])
}

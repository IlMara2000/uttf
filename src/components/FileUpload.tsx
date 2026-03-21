'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function FileUpload({ activityId }: { activityId?: number }) {
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true)
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // 1. Upload su Storage Bucket "factory_media"
      const { error: uploadError } = await supabase.storage
        .from('factory_media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Ottieni URL pubblico
      const { data: urlData } = supabase.storage
        .from('factory_media')
        .getPublicUrl(filePath)

      // 3. Salva riferimento nel Database con collegamento all'attività
      const { error: dbError } = await supabase
        .from('media_storage')
        .insert([
          {
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            activity_id: activityId || null,
            is_social_ready: false
          }
        ])

      if (dbError) throw dbError

      router.refresh()
    } catch (error: any) {
      console.error('Upload Error:', error.message)
      alert('UPLOAD_FAILED: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative overflow-hidden group/upload">
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
      />
      <div className={`
        border border-zinc-800 py-2 px-4 flex items-center justify-between transition-all
        ${uploading ? 'bg-zinc-900 border-orange-500' : 'bg-black hover:border-zinc-500'}
      `}>
        <span className={`text-[9px] font-black uppercase tracking-widest ${uploading ? 'text-orange-500 animate-pulse' : 'text-zinc-500'}`}>
          {uploading ? '>> SYNCING_FILE...' : '++ ATTACH_MEDIA'}
        </span>
        {!uploading && (
          <span className="text-[10px] text-zinc-700 group-hover/upload:text-white transition-colors">UPLOAD</span>
        )}
      </div>
      
      {/* Barra di progresso fake sotto al tasto se sta caricando */}
      {uploading && (
        <div className="absolute bottom-0 left-0 h-[1px] bg-orange-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '100%' }}></div>
      )}
    </div>
  )
}
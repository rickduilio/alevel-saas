"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  entityType: "payment" | "receivable" | "task";
  entityId: string;
  attachmentType: "comprovante" | "reembolso" | "orcamento" | "boleto" | "outros";
  onUploaded: () => void;
}

export default function FileUpload({ entityType, entityId, attachmentType, onUploaded }: FileUploadProps) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${entityType}/${entityId}/${attachmentType}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("attachments")
      .getPublicUrl(filePath);

    await supabase.from("attachments").insert({
      entity_type: entityType,
      entity_id: entityId,
      type: attachmentType,
      filename: file.name,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
    } as never);

    setUploading(false);
    onUploaded();
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
        dragOver ? "border-cyan-400 bg-cyan-600/10" : "border-slate-700 hover:border-slate-600"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
        accept="image/png,image/jpeg,image/webp,application/pdf,.csv,.xlsx"
      />
      {uploading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-cyan-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando...
        </div>
      ) : (
        <div className="text-sm text-slate-400">
          <Upload className="h-6 w-6 mx-auto mb-1 text-slate-500" />
          <p>Arraste o arquivo ou clique para selecionar</p>
          <p className="text-xs text-slate-600 mt-1">
            {attachmentType === "comprovante" && "Comprovante de pagamento"}
            {attachmentType === "orcamento" && "Orçamento"}
            {attachmentType === "reembolso" && "Comprovante de reembolso"}
            {attachmentType === "boleto" && "Boleto"}
            {attachmentType === "outros" && "Outros documentos"}
          </p>
        </div>
      )}
    </div>
  );
}

export function AttachmentList({
  attachments,
  onDelete,
}: {
  attachments: { id: string; filename: string; file_url: string; type: string; file_size: number | null; mime_type?: string | null }[];
  onDelete?: (id: string) => void;
}) {
  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      {attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg border border-slate-700">
          {att.mime_type?.startsWith("image/") ? (
            <ImageIcon className="h-8 w-8 text-cyan-400 flex-shrink-0" />
          ) : (
            <FileText className="h-8 w-8 text-slate-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <a
              href={att.file_url}
              target="_blank"
              className="text-sm text-cyan-400 hover:underline truncate block"
            >
              {att.filename}
            </a>
            <p className="text-xs text-slate-500">
              {att.type} {att.file_size && `· ${formatSize(att.file_size)}`}
            </p>
          </div>
          {onDelete && (
            <button onClick={() => onDelete(att.id)} className="text-slate-500 hover:text-red-400 p-1">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

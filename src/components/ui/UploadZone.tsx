import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, X, File, CheckCircle } from 'lucide-react';
import { cn, formatFileSize } from '../../lib/utils';

interface UploadZoneProps {
  accept?: Record<string, string[]>;
  maxSize?: number;
  onUpload: (files: File[]) => void;
  uploading?: boolean;
  progress?: number;
  uploadedFile?: { name: string; size: number } | null;
  label?: string;
  hint?: string;
}

export function UploadZone({
  accept,
  maxSize = 100 * 1024 * 1024,
  onUpload,
  uploading = false,
  progress,
  uploadedFile,
  label,
  hint,
}: UploadZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);
      if (rejectedFiles.length > 0) {
        setError(rejectedFiles[0].errors[0]?.message || 'File rejected');
        return;
      }
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-3 p-4 bg-[#18181b] border border-[#27272a] rounded-xl">
        <div className="w-10 h-10 rounded-lg bg-[#22c55e]/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-[#22c55e]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#fafafa] truncate">{uploadedFile.name}</p>
          <p className="text-xs text-[#71717a]">{formatFileSize(uploadedFile.size)}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150',
        isDragActive
          ? 'border-[#d4d4d8] bg-[#d4d4d8]/5'
          : 'border-[#27272a] hover:border-[#3f3f46] hover:bg-[#18181b]',
        error && 'border-[#ef4444] bg-[#ef4444]/5'
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            'w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-colors',
            isDragActive ? 'bg-[#d4d4d8]/20 text-[#d4d4d8]' : 'bg-[#27272a] text-[#71717a]'
          )}
        >
          {uploading ? (
            <File className="w-6 h-6 animate-pulse" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </div>
        {label && <p className="text-sm font-medium text-[#fafafa] mb-1">{label}</p>}
        {hint && <p className="text-xs text-[#71717a]">{hint}</p>}
        {error && <p className="mt-2 text-sm text-[#ef4444]">{error}</p>}
        {uploading && progress !== undefined && (
          <div className="mt-4 w-full max-w-xs">
            <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d4d4d8] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MultiUploadZoneProps {
  accept?: Record<string, string[]>;
  maxSize?: number;
  maxFiles?: number;
  files: { name: string; url: string; size?: number }[];
  onUpload: (files: File[]) => void;
  onRemove: (index: number) => void;
  label?: string;
  hint?: string;
}

export function MultiUploadZone({
  accept,
  maxSize = 50 * 1024 * 1024,
  maxFiles = 10,
  files,
  onUpload,
  onRemove,
  label,
  hint,
}: MultiUploadZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      if (files.length + acceptedFiles.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }
      onUpload(acceptedFiles);
    },
    [onUpload, files.length, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: true,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          'p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-150 text-center',
          isDragActive
            ? 'border-[#d4d4d8] bg-[#d4d4d8]/5'
            : 'border-[#27272a] hover:border-[#3f3f46] hover:bg-[#18181b]'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <Upload className={cn('w-6 h-6 mb-2', isDragActive ? 'text-[#d4d4d8]' : 'text-[#71717a]')} />
          <p className="text-sm font-medium text-[#fafafa] mb-1">{label || 'Drop files here'}</p>
          <p className="text-xs text-[#71717a]">{hint || `or click to select (max ${maxFiles} files)`}</p>
        </div>
      </div>
      {error && <p className="text-sm text-[#ef4444]">{error}</p>}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div
              key={file.url}
              className="relative group p-3 bg-[#18181b] border border-[#27272a] rounded-lg"
            >
              <div className="aspect-square mb-2 rounded-lg bg-[#27272a] overflow-hidden">
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-[#a1a1aa] truncate">{file.name}</p>
              <button
                onClick={() => onRemove(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-[#ef4444] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

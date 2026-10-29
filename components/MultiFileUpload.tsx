'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { UploadCloud, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from "next/image";

interface MultiFileUploadProps {
  onFilesSelect?: (files: File[]) => void;
  maxSizeMB?: number;
  maxFiles?: number;
  label?: string;
  description?: string;
  className?: string;
  existingUrls?: string[];
  onExistingUrlsChange?: (urls: string[]) => void;
}

export default function MultiFileUpload({
  onFilesSelect,
  maxSizeMB = 5,
  maxFiles = 10,
  label = "Upload Photos",
  description = "JPG, PNG or WEBP (Max 5MB each)",
  className,
  existingUrls = [],
  onExistingUrlsChange,
}: MultiFileUploadProps) {
  const [files, setFiles] = useState<{ file: File, preview: string }[]>([]);
  const [existing, setExisting] = useState<string[]>(existingUrls);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError(null);

    if (fileRejections.length > 0) {
      const rejection = fileRejections[0];
      if (rejection.errors[0].code === 'file-too-large') {
        setError(`A file is too large. Max size is ${maxSizeMB}MB.`);
      } else {
        setError(rejection.errors[0].message);
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const newFiles = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      
      const combined = [...files, ...newFiles].slice(0, maxFiles - existing.length);
      setFiles(combined);
      onFilesSelect?.(combined.map(f => f.file));
    }
  }, [maxSizeMB, maxFiles, onFilesSelect, files, existing.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
    },
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
  });

  const removeFile = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    const updated = files.filter((_, i) => i !== indexToRemove);
    setFiles(updated);
    onFilesSelect?.(updated.map(f => f.file));
    setError(null);
  };

  const removeExisting = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    const updated = existing.filter((_, i) => i !== indexToRemove);
    setExisting(updated);
    onExistingUrlsChange?.(updated);
  };

  return (
    <div className={cn("w-full", className)}>
      <label className="text-14 font-medium text-gray-700 mb-2 block">{label}</label>
      
      {/* Previews Grid */}
      {(files.length > 0 || existing.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {existing.map((url, idx) => (
            <div key={`existing-${idx}`} className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm group">
              <Image
                src={url}
                alt={`Existing ${idx}`}
                fill
                className="object-cover bg-white"
              />
              <button
                type="button"
                onClick={(e) => removeExisting(e, idx)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                title="Remove existing photo"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {files.map((fileObj, idx) => (
            <div key={`new-${idx}`} className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm group">
              <Image
                src={fileObj.preview}
                alt={`Preview ${idx}`}
                fill
                className="object-cover bg-white"
              />
              <button
                type="button"
                onClick={(e) => removeFile(e, idx)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                title="Remove photo"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(files.length + existing.length) < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed rounded-xl transition-all cursor-pointer group",
            isDragActive ? "border-blue-500 bg-blue-50/50" : "border-gray-200 hover:border-gray-300 bg-gray-50/30",
            error && "border-red-300 bg-red-50/30"
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center text-center p-4">
            <div className="p-2 bg-white rounded-full shadow-sm mb-2 border border-gray-100 group-hover:scale-110 transition-transform">
              <UploadCloud className="size-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <p className="text-13 font-semibold text-gray-900">
              {isDragActive ? "Drop photos here" : "Click to add photos or drag and drop"}
            </p>
            <p className="text-11 text-gray-500 mt-1">{description}</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-1.5 text-red-600 mt-3">
          <AlertCircle className="size-3.5" />
          <span className="text-12 font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}

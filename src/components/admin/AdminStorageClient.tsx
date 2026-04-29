"use client";

import { useState, useEffect } from "react";

interface StorageFile {
  name:        string;
  path:        string;
  url:         string;
  size:        number;
  created_at:  string;
  user_folder: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k     = 1024;
  const sizes = ["B","KB","MB","GB"];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AdminStorageClient() {
  const [files,      setFiles]      = useState<StorageFile[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [preview,    setPreview]    = useState<StorageFile | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [search,     setSearch]     = useState("");

  useEffect(() => { fetchFiles(); }, []);

  async function fetchFiles() {
    setIsLoading(true);
    const res  = await fetch("/api/admin/storage");
    const data = await res.json();
    setFiles(data.data?.files ?? []);
    setIsLoading(false);
  }

  async function deleteFile(file: StorageFile) {
    if (!confirm(`Delete ${file.name}? This cannot be undone.`)) return;
    setIsDeleting(file.path);
    await fetch(
      `/api/admin/storage/${encodeURIComponent(file.path)}`,
      { method: "DELETE" }
    );
    setIsDeleting(null);
    setPreview(null);
    fetchFiles();
  }

  const filtered = files.filter(
    (f) =>
      search === "" ||
      f.path.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold">Storage Manager</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {files.length} files · {formatBytes(totalSize)} used · Superadmin only
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Files",  value: files.length,           icon: "🖼️" },
          { label: "Total Size",   value: formatBytes(totalSize),  icon: "💾" },
          {
            label: "User Folders",
            value: new Set(files.map((f) => f.user_folder)).size,
            icon: "📁",
          },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-black">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] font-semibold
                            uppercase tracking-wide mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4 mb-4">
        <input
          type="text"
          placeholder="Filter by path or filename…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />
      </div>

      {/* File grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-ghana-black border-t-transparent
                          rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🗄️</p>
          <p className="font-semibold">
            {search ? "No files match your search" : "Storage is empty"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filtered.map((file) => (
            <div
              key={file.path}
              onClick={() => setPreview(file)}
              className="card-hover overflow-hidden cursor-pointer group"
            >
              {/* Thumbnail */}
              <div className="relative h-28 bg-[var(--surface-2)]">
                <img
                  src={file.url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {isDeleting === file.path && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent
                                    rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-[10px] text-[var(--text-subtle)] truncate font-mono">
                  {file.name}
                </p>
                <p className="text-[10px] text-[var(--text-subtle)]">
                  {formatBytes(file.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center
                     p-4 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-lg w-full animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={preview.url}
              alt=""
              className="w-full max-h-72 object-cover"
            />
            <div className="p-5">
              <div className="flex flex-col gap-2 mb-4 text-xs">
                {[
                  { label: "Path",    value: preview.path },
                  { label: "Size",    value: formatBytes(preview.size) },
                  { label: "Folder",  value: preview.user_folder },
                  {
                    label: "Created",
                    value: preview.created_at
                      ? new Date(preview.created_at).toLocaleDateString("en-GH")
                      : "Unknown",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2">
                    <span className="font-bold text-[var(--text-subtle)] uppercase
                                     tracking-wide w-14 flex-shrink-0">
                      {label}
                    </span>
                    <span className="font-mono text-[var(--text-muted)] break-all">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline flex-1 py-2.5 text-sm text-center"
                >
                  🔗 Open
                </a>
                <button
                  onClick={() => deleteFile(preview)}
                  disabled={isDeleting === preview.path}
                  className="flex-1 py-2.5 rounded-xl border-2 border-ghana-red/30
                             text-ghana-red text-sm font-semibold hover:bg-ghana-red/5
                             transition-colors disabled:opacity-40"
                >
                  🗑️ Delete File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
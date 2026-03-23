import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadConfig } from "@/config";
import {
  type FileFolder,
  INITIAL_FILE_FOLDERS,
  getUserById,
} from "@/data/mockData";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { StorageClient } from "@/utils/StorageClient";
import { HttpAgent } from "@icp-sdk/core/agent";
import {
  ArrowLeft,
  Download,
  File,
  FileAudio,
  FileImage,
  FileText,
  Plus,
  Share2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type FileType = "audio" | "image" | "pdf" | "doc" | "video";

interface UploadedFile {
  id: string;
  name: string;
  type: FileType;
  size: string;
  uploaderId: string;
  uploadDate: string;
  blobHash?: string;
  downloadUrl?: string;
}

const FILE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  audio: FileAudio,
  image: FileImage,
  pdf: FileText,
  video: File,
  doc: File,
};

const FILE_COLORS: Record<string, string> = {
  audio: "#FF4500",
  image: "#22C55E",
  pdf: "#3B82F6",
  video: "#8B5CF6",
  doc: "#FFA500",
};

function FileIcon({
  type,
  className,
  style,
}: { type: string; className?: string; style?: React.CSSProperties }) {
  const Icon = FILE_ICONS[type] || File;
  return <Icon className={className} style={style} />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function detectFileType(file: File): FileType {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "doc";
}

export default function FilesPage() {
  const { identity } = useInternetIdentity();
  const [folders, setFolders] = useState<
    (FileFolder & { uploadedFiles?: UploadedFile[] })[]
  >(INITIAL_FILE_FOLDERS.map((f) => ({ ...f, uploadedFiles: [] })));
  const [activeFolder, setActiveFolder] = useState<
    (FileFolder & { uploadedFiles?: UploadedFile[] }) | null
  >(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadFolderId) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const config = await loadConfig();
      const agent = new HttpAgent({
        host: config.backend_host,
        identity: identity ?? undefined,
      });

      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );

      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const { hash } = await storageClient.putFile(bytes, (pct) => {
        setUploadProgress(pct);
      });

      const downloadUrl = await storageClient.getDirectURL(hash);

      const newFile: UploadedFile = {
        id: `file-${Date.now()}`,
        name: selectedFile.name,
        type: detectFileType(selectedFile),
        size: formatFileSize(selectedFile.size),
        uploaderId: identity?.getPrincipal().toText() ?? "unknown",
        uploadDate: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        blobHash: hash,
        downloadUrl,
      };

      setFolders((prev) =>
        prev.map((f) =>
          f.id === uploadFolderId
            ? {
                ...f,
                uploadedFiles: [...(f.uploadedFiles ?? []), newFile],
                fileCount: f.fileCount + 1,
              }
            : f,
        ),
      );

      if (activeFolder?.id === uploadFolderId) {
        setActiveFolder((prev) =>
          prev
            ? {
                ...prev,
                uploadedFiles: [...(prev.uploadedFiles ?? []), newFile],
                fileCount: prev.fileCount + 1,
              }
            : null,
        );
      }

      toast.success(`${selectedFile.name} uploaded successfully`);
      setSelectedFile(null);
      setUploadFolderId("");
      setUploadProgress(null);
      setShowUpload(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Upload failed: ${msg}`);
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const allFilesInFolder = (folder: (typeof folders)[0]) => [
    ...folder.files,
    ...(folder.uploadedFiles ?? []).map((f) => ({
      ...f,
      uploaderId: f.uploaderId,
    })),
  ];

  // === File List View ===
  if (activeFolder) {
    const allFiles = allFilesInFolder(activeFolder);
    return (
      <div className="flex flex-col min-h-screen">
        <header
          className="flex items-center gap-3 h-14 px-4 flex-shrink-0 sticky top-0 z-40"
          style={{
            backgroundColor: "oklch(0.10 0.008 40 / 0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid oklch(0.28 0.015 45)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveFolder(null)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xl">{activeFolder.emoji}</span>
          <span
            className="font-bold text-sm flex-1 truncate"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            {activeFolder.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {allFiles.length} files
          </span>
        </header>

        <main className="flex-1 pb-24 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2">
            {allFiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <File className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No files yet</p>
                <p className="text-xs mt-1">
                  Upload the first file to this folder
                </p>
              </div>
            ) : (
              allFiles.map((file, idx) => {
                const uploader = getUserById(file.uploaderId);
                const downloadUrl = (file as UploadedFile).downloadUrl;
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${FILE_COLORS[file.type] || "#666"}22`,
                      }}
                    >
                      <FileIcon
                        type={file.type}
                        className="w-5 h-5"
                        style={
                          {
                            color: FILE_COLORS[file.type] || "#999",
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.size} · {uploader?.displayName ?? "Member"} ·{" "}
                        {file.uploadDate}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {downloadUrl ? (
                        <a
                          href={downloadUrl}
                          download={file.name}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </main>

        <button
          type="button"
          onClick={() => {
            setUploadFolderId(activeFolder.id);
            setShowUpload(true);
          }}
          className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-orange transition-all hover:scale-105 active:scale-95 z-40"
          style={{ backgroundColor: "#FF4500" }}
        >
          <Upload className="w-6 h-6 text-white" />
        </button>

        {renderUploadModal()}
      </div>
    );
  }

  function renderUploadModal() {
    return (
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
            onClick={(e) =>
              e.target === e.currentTarget && setShowUpload(false)
            }
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 flex flex-col gap-4"
              style={{
                backgroundColor: "oklch(0.17 0.01 45)",
                border: "1px solid oklch(0.28 0.015 45)",
              }}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="font-bold text-lg"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Upload File
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (!isUploading) {
                      setShowUpload(false);
                      setSelectedFile(null);
                      setUploadProgress(null);
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt,.zip"
                />

                {/* Dropzone / file picker trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors w-full"
                  style={{
                    borderColor: selectedFile
                      ? "#FF4500"
                      : "oklch(0.35 0.02 45)",
                    backgroundColor: selectedFile
                      ? "oklch(0.18 0.015 30)"
                      : undefined,
                  }}
                >
                  {selectedFile ? (
                    <>
                      <FileIcon
                        type={detectFileType(selectedFile)}
                        className="w-8 h-8 mx-auto mb-2"
                        style={
                          {
                            color: FILE_COLORS[detectFileType(selectedFile)],
                          } as React.CSSProperties
                        }
                      />
                      <p className="text-sm font-medium truncate px-2">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFileSize(selectedFile.size)} · Tap to change
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Tap to select file
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max 100MB
                      </p>
                    </>
                  )}
                </button>

                {/* Upload progress */}
                {uploadProgress !== null && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uploading…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: "oklch(0.28 0.015 45)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${uploadProgress}%`,
                          backgroundColor: "#FF4500",
                        }}
                      />
                    </div>
                  </div>
                )}

                <Select
                  value={uploadFolderId}
                  onValueChange={(v) => setUploadFolderId(v)}
                  disabled={isUploading}
                >
                  <SelectTrigger
                    className="h-11 rounded-xl text-sm"
                    style={{
                      backgroundColor: "oklch(0.20 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                    }}
                  >
                    <SelectValue placeholder="Choose folder…" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.emoji} {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!isUploading) {
                      setShowUpload(false);
                      setSelectedFile(null);
                      setUploadProgress(null);
                    }
                  }}
                  className="flex-1 h-11 rounded-xl"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !uploadFolderId || isUploading}
                  className="flex-1 h-11 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                >
                  {isUploading ? "Uploading…" : "Upload"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // === Folder Grid View ===
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader title="Files" />

      <main className="flex-1 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-bold text-base"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Folders
            </h2>
            <span className="text-xs text-muted-foreground">
              {folders.reduce(
                (acc, f) => acc + f.fileCount + (f.uploadedFiles?.length ?? 0),
                0,
              )}{" "}
              files total
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {folders.map((folder, idx) => (
              <motion.button
                key={folder.id}
                onClick={() => setActiveFolder(folder)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border hover:brightness-110 transition-all text-left"
                style={{
                  backgroundColor: "oklch(0.17 0.01 45)",
                  borderColor: "oklch(0.28 0.015 45)",
                }}
              >
                <span className="text-4xl">{folder.emoji}</span>
                <div className="text-center">
                  <p
                    className="font-semibold text-sm"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    {folder.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {folder.fileCount + (folder.uploadedFiles?.length ?? 0)}{" "}
                    files
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">
              Recent Uploads
            </h3>
            <div className="space-y-2">
              {folders
                .flatMap((f) => [...f.files, ...(f.uploadedFiles ?? [])])
                .slice(0, 4)
                .map((file) => {
                  const uploader = getUserById(file.uploaderId);
                  return (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{
                        backgroundColor: "oklch(0.17 0.01 45)",
                        borderColor: "oklch(0.28 0.015 45)",
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: `${FILE_COLORS[file.type] || "#666"}22`,
                        }}
                      >
                        <FileIcon
                          type={file.type}
                          className="w-4 h-4"
                          style={
                            {
                              color: FILE_COLORS[file.type] || "#999",
                            } as React.CSSProperties
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {uploader?.displayName ?? "Member"} ·{" "}
                          {file.uploadDate}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {file.size}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </main>

      <button
        type="button"
        onClick={() => setShowUpload(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-orange transition-all hover:scale-105 active:scale-95 z-40"
        style={{ backgroundColor: "#FF4500" }}
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {renderUploadModal()}
    </div>
  );
}

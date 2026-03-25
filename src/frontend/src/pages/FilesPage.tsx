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
import { useActor } from "@/hooks/useActor";
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
  Loader2,
  Music,
  Plus,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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
  backendId?: bigint;
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

function getMimeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    mp4: "video/mp4",
    mov: "video/quicktime",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    zip: "application/zip",
  };
  return map[ext] || "application/octet-stream";
}

async function handleDownload(
  file: { name: string; downloadUrl?: string },
  setDownloading: (id: string | null) => void,
) {
  if (!file.downloadUrl) return;
  setDownloading(file.name);
  try {
    const resp = await fetch(file.downloadUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rawBlob = await resp.blob();
    const mime =
      rawBlob.type && rawBlob.type !== "application/octet-stream"
        ? rawBlob.type
        : getMimeFromFilename(file.name);
    const blob = new Blob([rawBlob], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    toast.error(`Download failed: ${msg}`);
  } finally {
    setDownloading(null);
  }
}

export default function FilesPage() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const [folders, setFolders] = useState<
    (FileFolder & { uploadedFiles?: UploadedFile[] })[]
  >(INITIAL_FILE_FOLDERS.map((f) => ({ ...f, files: [], uploadedFiles: [] })));
  const [activeFolder, setActiveFolder] = useState<
    (FileFolder & { uploadedFiles?: UploadedFile[] }) | null
  >(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load file records from backend on mount
  useEffect(() => {
    if (actorFetching) return;
    if (!actor) {
      setLoadingFiles(false);
      return;
    }

    const load = async () => {
      setLoadingFiles(true);
      try {
        const records = await actor.getFileRecords();
        setFolders((prev) => {
          const updated = prev.map((f) => ({
            ...f,
            uploadedFiles: [] as UploadedFile[],
          }));
          for (const record of records) {
            const fileType = (
              record.fileType as string
            ).toLowerCase() as FileType;
            const mapped: UploadedFile = {
              id: String(record.id),
              name: record.name as string,
              type: ["audio", "image", "pdf", "doc", "video"].includes(fileType)
                ? fileType
                : "doc",
              size: record.size as string,
              uploaderId: record.uploaderPrincipal?.toString() ?? "unknown",
              uploadDate: record.uploadDate as string,
              blobHash: record.blobHash as string,
              downloadUrl: record.downloadUrl as string,
              backendId: record.id as bigint,
            };
            const folderIdx = updated.findIndex(
              (f) => f.id === record.folderId,
            );
            const target = folderIdx >= 0 ? folderIdx : 0;
            updated[target].uploadedFiles!.push(mapped);
          }
          // update fileCount to match uploaded files
          return updated.map((f) => ({
            ...f,
            fileCount: f.uploadedFiles?.length ?? 0,
          }));
        });
      } catch {
        // silently show empty list if backend fails
      } finally {
        setLoadingFiles(false);
      }
    };

    load();
  }, [actor, actorFetching]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
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

      const uploadDate = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const fileType = detectFileType(selectedFile);
      const sizeStr = formatFileSize(selectedFile.size);

      // Save to backend
      let backendId: bigint | undefined;
      if (actor) {
        try {
          backendId = await actor.saveFileRecord(
            selectedFile.name,
            fileType,
            sizeStr,
            hash,
            downloadUrl,
            uploadFolderId,
            uploadDate,
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          throw new Error(`Could not save file to backend: ${errMsg}`);
        }
      }

      const newFile: UploadedFile = {
        id: backendId !== undefined ? String(backendId) : `file-${Date.now()}`,
        name: selectedFile.name,
        type: fileType,
        size: sizeStr,
        uploaderId: identity?.getPrincipal().toText() ?? "unknown",
        uploadDate,
        blobHash: hash,
        downloadUrl,
        backendId,
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

  const handleDeleteFile = async (fileId: string) => {
    // Find the file to get its backendId
    let backendId: bigint | undefined;
    for (const folder of folders) {
      const found = folder.uploadedFiles?.find((f) => f.id === fileId);
      if (found) {
        backendId = found.backendId;
        break;
      }
    }

    // Delete from backend
    if (backendId !== undefined && actor) {
      try {
        await actor.deleteFileRecord(backendId);
      } catch {
        // continue even if backend delete fails
      }
    }

    setFolders((prev) =>
      prev.map((f) => {
        if (f.id !== activeFolder?.id) return f;
        const filtered = (f.uploadedFiles ?? []).filter(
          (uf) => uf.id !== fileId,
        );
        return { ...f, uploadedFiles: filtered, fileCount: f.fileCount - 1 };
      }),
    );
    setActiveFolder((prev) => {
      if (!prev) return prev;
      const filtered = (prev.uploadedFiles ?? []).filter(
        (uf) => uf.id !== fileId,
      );
      return {
        ...prev,
        uploadedFiles: filtered,
        fileCount: prev.fileCount - 1,
      };
    });
    toast.success("File deleted");
  };

  const allFilesInFolder = (folder: (typeof folders)[0]) => [
    ...folder.files,
    ...(folder.uploadedFiles ?? []).map((f) => ({
      ...f,
      uploaderId: f.uploaderId,
    })),
  ];

  function renderPreviewModal() {
    if (!previewFile) return null;
    const isImage = previewFile.type === "image";
    const isAudio = previewFile.type === "audio";
    const isDownloading = downloadingId === previewFile.name;

    return (
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={(e) =>
              e.target === e.currentTarget && setPreviewFile(null)
            }
            data-ocid="files.modal"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full max-w-lg mx-4 rounded-2xl overflow-hidden flex flex-col"
              style={{
                backgroundColor: "oklch(0.14 0.01 45)",
                border: "1px solid oklch(0.28 0.015 45)",
                maxHeight: "90vh",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
                style={{ borderBottom: "1px solid oklch(0.22 0.012 45)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${FILE_COLORS[previewFile.type] || "#666"}22`,
                  }}
                >
                  <FileIcon
                    type={previewFile.type}
                    className="w-4 h-4"
                    style={
                      {
                        color: FILE_COLORS[previewFile.type] || "#999",
                      } as React.CSSProperties
                    }
                  />
                </div>
                <p className="flex-1 text-sm font-medium truncate">
                  {previewFile.name}
                </p>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors flex-shrink-0"
                  data-ocid="files.close_button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview content */}
              <div
                className="flex-1 overflow-auto flex items-center justify-center p-4"
                style={{ minHeight: 0 }}
              >
                {isImage && previewFile.downloadUrl ? (
                  <img
                    src={previewFile.downloadUrl}
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    style={{ maxHeight: "60vh" }}
                  />
                ) : isAudio && previewFile.downloadUrl ? (
                  <div className="w-full flex flex-col items-center gap-4 py-6">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: "#FF450022" }}
                    >
                      <Music
                        className="w-10 h-10"
                        style={{ color: "#FF4500" }}
                      />
                    </div>
                    <p className="text-sm font-medium text-center px-4 truncate max-w-full">
                      {previewFile.name}
                    </p>
                    {/* biome-ignore lint/a11y/useMediaCaption: user-uploaded file without captions */}
                    <audio
                      controls
                      className="w-full mt-2"
                      src={previewFile.downloadUrl}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8 px-4">
                    <div
                      className="w-24 h-24 rounded-2xl flex items-center justify-center"
                      style={{
                        backgroundColor: `${FILE_COLORS[previewFile.type] || "#666"}22`,
                      }}
                    >
                      <FileIcon
                        type={previewFile.type}
                        className="w-12 h-12"
                        style={
                          {
                            color: FILE_COLORS[previewFile.type] || "#999",
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-base">
                        {previewFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {previewFile.size}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div
                className="flex gap-2 p-4 flex-shrink-0"
                style={{ borderTop: "1px solid oklch(0.22 0.012 45)" }}
              >
                <Button
                  variant="ghost"
                  className="flex-1 h-11 rounded-xl"
                  onClick={() => setPreviewFile(null)}
                  data-ocid="files.cancel_button"
                >
                  Close
                </Button>
                {previewFile.downloadUrl && (
                  <Button
                    className="flex-1 h-11 rounded-xl font-semibold text-white"
                    style={{ backgroundColor: "#FF4500" }}
                    disabled={isDownloading}
                    onClick={() =>
                      handleDownload(
                        {
                          name: previewFile.name,
                          downloadUrl: previewFile.downloadUrl,
                        },
                        setDownloadingId,
                      )
                    }
                    data-ocid="files.primary_button"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

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
            data-ocid="files.link"
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
            {loadingFiles ? (
              <div
                className="flex items-center justify-center py-12"
                data-ocid="files.loading_state"
              >
                <Loader2
                  className="w-6 h-6 animate-spin"
                  style={{ color: "#FF4500" }}
                />
              </div>
            ) : allFiles.length === 0 ? (
              <div
                className="text-center py-12 text-muted-foreground"
                data-ocid="files.empty_state"
              >
                <File className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No files yet</p>
                <p className="text-xs mt-1">
                  Upload the first file to this folder
                </p>
              </div>
            ) : (
              allFiles.map((file, idx) => {
                const uploader = getUserById(file.uploaderId);
                const uploadedFile = file as UploadedFile;
                const hasDownload = !!uploadedFile.downloadUrl;
                const isDownloading = downloadingId === file.name;
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:brightness-110 transition-all"
                    style={{
                      backgroundColor: "oklch(0.17 0.01 45)",
                      borderColor: "oklch(0.28 0.015 45)",
                    }}
                    onClick={() => hasDownload && setPreviewFile(uploadedFile)}
                    data-ocid={`files.item.${idx + 1}`}
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
                    <div
                      className="flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {hasDownload ? (
                        <button
                          type="button"
                          disabled={isDownloading}
                          onClick={() =>
                            handleDownload(
                              {
                                name: file.name,
                                downloadUrl: uploadedFile.downloadUrl,
                              },
                              setDownloadingId,
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                          data-ocid={`files.secondary_button.${idx + 1}`}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
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
                      {hasDownload && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFile(file.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/20 transition-colors group"
                          data-ocid={`files.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-destructive transition-colors" />
                        </button>
                      )}
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
          data-ocid="files.upload_button"
        >
          <Upload className="w-6 h-6 text-white" />
        </button>

        {renderUploadModal()}
        {renderPreviewModal()}
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
              data-ocid="files.dialog"
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
                  data-ocid="files.close_button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt,.zip"
                />

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
                  data-ocid="files.dropzone"
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

                {uploadProgress !== null && (
                  <div
                    className="flex flex-col gap-1"
                    data-ocid="files.loading_state"
                  >
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
                    data-ocid="files.select"
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
                  data-ocid="files.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !uploadFolderId || isUploading}
                  className="flex-1 h-11 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                  data-ocid="files.submit_button"
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

          {loadingFiles ? (
            <div
              className="flex items-center justify-center py-16"
              data-ocid="files.loading_state"
            >
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "#FF4500" }}
              />
            </div>
          ) : (
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
                  data-ocid={`files.item.${idx + 1}`}
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
          )}

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
        data-ocid="files.upload_button"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {renderUploadModal()}
      {renderPreviewModal()}
    </div>
  );
}

import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type FileFolder,
  type FileItem,
  INITIAL_FILE_FOLDERS,
  getUserById,
} from "@/data/mockData";
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
import { useState } from "react";

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
}: {
  type: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = FILE_ICONS[type] || File;
  return <Icon className={className} style={style} />;
}

export default function FilesPage() {
  const [folders, setFolders] = useState<FileFolder[]>(INITIAL_FILE_FOLDERS);
  const [activeFolder, setActiveFolder] = useState<FileFolder | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    folderId: "",
    fileName: "",
  });

  const handleUpload = () => {
    if (!uploadForm.folderId || !uploadForm.fileName.trim()) return;
    const newFile: FileItem = {
      id: `file-${Date.now()}`,
      name: uploadForm.fileName.trim(),
      type: "doc",
      size: "0.1 MB",
      uploaderId: "user-1",
      uploadDate: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
    setFolders((prev) =>
      prev.map((f) =>
        f.id === uploadForm.folderId
          ? {
              ...f,
              files: [...f.files, newFile],
              fileCount: f.fileCount + 1,
            }
          : f,
      ),
    );
    if (activeFolder?.id === uploadForm.folderId) {
      setActiveFolder((prev) =>
        prev
          ? {
              ...prev,
              files: [...prev.files, newFile],
              fileCount: prev.fileCount + 1,
            }
          : null,
      );
    }
    setUploadForm({ folderId: "", fileName: "" });
    setShowUpload(false);
  };

  // === File List View ===
  if (activeFolder) {
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
            {activeFolder.files.length} files
          </span>
        </header>

        <main className="flex-1 pb-24 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 pt-4 space-y-2">
            {activeFolder.files.length === 0 ? (
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
              activeFolder.files.map((file, idx) => {
                const uploader = getUserById(file.uploaderId);
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
                    {/* Icon */}
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

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.size} · {uploader?.displayName || "Unknown"} ·{" "}
                        {file.uploadDate}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
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

        {/* Upload FAB */}
        <button
          type="button"
          onClick={() => {
            setUploadForm((p) => ({ ...p, folderId: activeFolder.id }));
            setShowUpload(true);
          }}
          data-ocid="files.upload.button"
          className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-orange transition-all hover:scale-105 active:scale-95 z-40"
          style={{ backgroundColor: "#FF4500" }}
        >
          <Upload className="w-6 h-6 text-white" />
        </button>
      </div>
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
              {folders.reduce((acc, f) => acc + f.fileCount, 0)} files total
            </span>
          </div>

          {/* Folder grid */}
          <div className="grid grid-cols-2 gap-3">
            {folders.map((folder, idx) => (
              <motion.button
                key={folder.id}
                onClick={() => setActiveFolder(folder)}
                data-ocid={`files.folder.item.${idx + 1}`}
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
                    {folder.fileCount} files
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Recent uploads */}
          <div className="mt-6">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">
              Recent Uploads
            </h3>
            <div className="space-y-2">
              {folders
                .flatMap((f) => f.files)
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
                          {uploader?.displayName} · {file.uploadDate}
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

      {/* Upload FAB */}
      <button
        type="button"
        onClick={() => setShowUpload(true)}
        data-ocid="files.upload.button"
        className="fixed bottom-20 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-orange transition-all hover:scale-105 active:scale-95 z-40"
        style={{ backgroundColor: "#FF4500" }}
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* Upload Modal */}
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
                  onClick={() => setShowUpload(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  style={{ borderColor: "oklch(0.35 0.02 45)" }}
                  data-ocid="files.dropzone"
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Tap to select file
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 100MB
                  </p>
                </div>

                <Input
                  placeholder="File name…"
                  value={uploadForm.fileName}
                  onChange={(e) =>
                    setUploadForm((p) => ({ ...p, fileName: e.target.value }))
                  }
                  className="h-11 rounded-xl text-sm"
                  style={{
                    backgroundColor: "oklch(0.20 0.01 45)",
                    borderColor: "oklch(0.28 0.015 45)",
                  }}
                />

                <Select
                  value={uploadForm.folderId}
                  onValueChange={(v) =>
                    setUploadForm((p) => ({ ...p, folderId: v }))
                  }
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
                  onClick={() => setShowUpload(false)}
                  className="flex-1 h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!uploadForm.folderId || !uploadForm.fileName.trim()}
                  className="flex-1 h-11 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#FF4500" }}
                  data-ocid="files.upload.button"
                >
                  Upload
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

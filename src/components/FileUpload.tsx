import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import Papa from "papaparse";
import { Id } from "../../convex/_generated/dataModel";

export function FileUpload({
  projectId,
  onComplete,
  onBack,
}: {
  projectId: Id<"projects">;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFileData = useMutation(api.files.save);

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      // Parse the CSV/SPSS file
      const result = await new Promise<Papa.ParseResult<Record<string, any>>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          complete: resolve,
          error: reject,
        });
      });

      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();
      
      // Save file metadata
      await saveFileData({
        projectId,
        fileName: file.name,
        fileId: storageId,
        variables: Object.keys(result.data[0] || {}),
      });

      toast.success("File uploaded successfully");
      onComplete();
    } catch (error) {
      toast.error("Failed to upload file");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept=".csv,.sav"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer text-indigo-600 hover:text-indigo-800"
        >
          {file ? file.name : "Choose a file"}
        </label>
      </div>
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800"
        >
          Back
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload and Continue"}
        </button>
      </div>
    </div>
  );
}

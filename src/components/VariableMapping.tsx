import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function VariableMapping({
  projectId,
  onComplete,
  onBack,
}: {
  projectId: Id<"projects">;
  onComplete: () => void;
  onBack: () => void;
}) {
  const fileData = useQuery(api.files.get, { projectId });
  const project = useQuery(api.projects.get, { projectId });
  const saveMapping = useMutation(api.analysis.saveMapping);

  const [mapping, setMapping] = useState({
    respondentId: "",
    tooCheap: "",
    cheap: "",
    expensive: "",
    tooExpensive: "",
    purchase: "",
    pricePoints: "",
    purchaseIntents: {} as Record<string, string>,
  });
  const [segments, setSegments] = useState<string[]>([]);

  if (!fileData || !project) return <div>Loading...</div>;

  const isVanWestendorp = project.analysisType === "van_westendorp";

  const handleSave = async () => {
    try {
      if (isVanWestendorp && (!mapping.tooCheap || !mapping.cheap || !mapping.expensive || !mapping.tooExpensive)) {
        toast.error("Please map all required variables");
        return;
      }
      if (!isVanWestendorp && (!mapping.pricePoints || Object.keys(mapping.purchaseIntents).length === 0)) {
        toast.error("Please map all required variables");
        return;
      }
      if (!mapping.respondentId) {
        toast.error("Please map respondent ID");
        return;
      }

      await saveMapping({
        projectId,
        mapping: {
          ...mapping,
          pricePoints: mapping.pricePoints ? mapping.pricePoints.split(",").map(Number) : undefined,
          purchase: Object.values(mapping.purchaseIntents).join(","),
        },
        segments,
      });
      toast.success("Variables mapped successfully");
      onComplete();
    } catch (error) {
      toast.error("Failed to save mapping");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold">Map Variables</h3>
        
        <div>
          <label className="block text-sm">Respondent ID</label>
          <select
            value={mapping.respondentId}
            onChange={(e) => setMapping({ ...mapping, respondentId: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300"
          >
            <option value="">Select variable</option>
            {fileData.variables.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        {isVanWestendorp ? (
          <>
            <div>
              <label className="block text-sm">Too Cheap Question</label>
              <select
                value={mapping.tooCheap}
                onChange={(e) => setMapping({ ...mapping, tooCheap: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
              >
                <option value="">Select variable</option>
                {fileData.variables.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Cheap Question</label>
              <select
                value={mapping.cheap}
                onChange={(e) => setMapping({ ...mapping, cheap: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
              >
                <option value="">Select variable</option>
                {fileData.variables.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Expensive Question</label>
              <select
                value={mapping.expensive}
                onChange={(e) => setMapping({ ...mapping, expensive: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
              >
                <option value="">Select variable</option>
                {fileData.variables.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Too Expensive Question</label>
              <select
                value={mapping.tooExpensive}
                onChange={(e) => setMapping({ ...mapping, tooExpensive: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300"
              >
                <option value="">Select variable</option>
                {fileData.variables.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm">Price Points (comma-separated)</label>
              <input
                type="text"
                value={mapping.pricePoints}
                onChange={(e) => {
                  const newPricePoints = e.target.value;
                  setMapping({ 
                    ...mapping, 
                    pricePoints: newPricePoints,
                    purchaseIntents: {}
                  });
                }}
                className="mt-1 block w-full rounded-md border-gray-300"
                placeholder="10,20,30,40,50"
              />
            </div>
            {mapping.pricePoints && mapping.pricePoints.split(",").map((pricePoint, index) => (
              <div key={index}>
                <label className="block text-sm">Purchase Intent for Price Point ${pricePoint.trim()}</label>
                <select
                  value={mapping.purchaseIntents[pricePoint.trim()] || ""}
                  onChange={(e) => setMapping({
                    ...mapping,
                    purchaseIntents: {
                      ...mapping.purchaseIntents,
                      [pricePoint.trim()]: e.target.value
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300"
                >
                  <option value="">Select variable</option>
                  {fileData.variables.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Segmentation Variables</h3>
        <div className="space-y-2">
          {fileData.variables.map((variable) => (
            <label key={variable} className="flex items-center">
              <input
                type="checkbox"
                checked={segments.includes(variable)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSegments([...segments, variable]);
                  } else {
                    setSegments(segments.filter((v) => v !== variable));
                  }
                }}
                className="mr-2"
              />
              {variable}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="text-gray-600 hover:text-gray-800">
          Back
        </button>
        <button
          onClick={handleSave}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Run Analysis
        </button>
      </div>
    </div>
  );
}

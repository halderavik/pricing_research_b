import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { FileUpload } from "./FileUpload";
import { VariableMapping } from "./VariableMapping";
import { Results } from "./Results";
import { Id } from "../../convex/_generated/dataModel";

const STEPS = ["Project Details", "Data Upload", "Variable Mapping", "Results"];

export function ProjectWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    analysisType: "van_westendorp",
  });
  const [projectId, setProjectId] = useState<Id<"projects"> | null>(null);

  const createProject = useMutation(api.projects.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = await createProject(projectData);
      setProjectId(id);
      setStep(1);
    } catch (error) {
      toast.error("Failed to create project");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">New Analysis Project</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        <div className="flex justify-between">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex-1 text-center ${
                i === step ? "text-indigo-600 font-semibold" : "text-gray-500"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              type="text"
              value={projectData.name}
              onChange={(e) =>
                setProjectData({ ...projectData, name: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={projectData.description}
              onChange={(e) =>
                setProjectData({ ...projectData, description: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Analysis Type
            </label>
            <select
              value={projectData.analysisType}
              onChange={(e) =>
                setProjectData({ ...projectData, analysisType: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="van_westendorp">Van Westendorp</option>
              <option value="gabor_granger">Gabor Granger</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Next
            </button>
          </div>
        </form>
      )}

      {step === 1 && projectId && (
        <FileUpload
          projectId={projectId}
          onComplete={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && projectId && (
        <VariableMapping
          projectId={projectId}
          onComplete={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && projectId && (
        <Results projectId={projectId} onBack={() => setStep(2)} />
      )}
    </div>
  );
}

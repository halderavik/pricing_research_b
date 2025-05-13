import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export function ProjectList() {
  const projects = useQuery(api.projects.list);
  const removeProject = useMutation(api.projects.remove);

  const handleDelete = async (projectId: Id<'projects'>) => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    try {
      await removeProject({ projectId });
      toast.success("Project deleted");
    } catch (e) {
      toast.error("Failed to delete project");
    }
  };

  if (!projects) {
    return <div>Loading...</div>;
  }

  if (projects.length === 0) {
    return <div className="text-center text-gray-500">No projects yet</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <div
          key={project._id}
          className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
        >
          <h3 className="font-semibold text-lg">{project.name}</h3>
          <p className="text-gray-600">{project.description}</p>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
            <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
              {project.analysisType}
            </span>
          </div>
          <button
            onClick={() => handleDelete(project._id as Id<'projects'>)}
            className="mt-4 text-xs text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

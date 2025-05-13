import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ProjectList } from "./components/ProjectList";
import { ProjectWizard } from "./components/ProjectWizard";
import { useState } from "react";

export default function App() {
  const [showNewProject, setShowNewProject] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-semibold accent-text">Pricing Analysis</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <Content showNewProject={showNewProject} setShowNewProject={setShowNewProject} />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content({ showNewProject, setShowNewProject }: { showNewProject: boolean; setShowNewProject: (show: boolean) => void }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold accent-text mb-4">Pricing Analysis</h1>
        <Authenticated>
          {showNewProject ? (
            <ProjectWizard onClose={() => setShowNewProject(false)} />
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xl text-slate-600">
                  Welcome back, {loggedInUser?.email ?? "friend"}!
                </p>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  New Analysis
                </button>
              </div>
              <ProjectList />
            </div>
          )}
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-slate-600">Sign in to get started</p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </div>
  );
}

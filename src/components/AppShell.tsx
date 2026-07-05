import { PropsWithChildren } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, Github, Search, ShieldCheck } from "lucide-react";
import barryLogo from "@/assets/barry-logo.png";
import { listThreads } from "@/lib/threads";

export function AppShell({ children }: PropsWithChildren) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const threadsQuery = useQuery({
    queryKey: ["threads"],
    queryFn: listThreads,
  });

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Barry workspace">
        <Link to="/chat" className="brand">
          <img src={barryLogo} alt="" width={42} height={42} />
          <span>
            <strong>Barry</strong>
            <small>AI Assistant</small>
          </span>
        </Link>

        <nav className="thread-nav" aria-label="Recent conversations">
          <p>Recent</p>
          {(threadsQuery.data ?? []).length === 0 ? (
            <span className="muted-small">No conversations yet</span>
          ) : (
            threadsQuery.data?.map((thread) => (
              <Link
                key={thread.id}
                to="/chat/$threadId"
                params={{ threadId: thread.id }}
                className={
                  pathname === `/chat/${thread.id}`
                    ? "thread-link active"
                    : "thread-link"
                }
              >
                {thread.title}
              </Link>
            ))
          )}
        </nav>

        <div className="capability-strip" aria-label="Barry capabilities">
          <span>
            <Bot aria-hidden="true" />
            Code and ops
          </span>
          <span>
            <Search aria-hidden="true" />
            Current research
          </span>
          <span>
            <ShieldCheck aria-hidden="true" />
            Confirmation gates
          </span>
          <span>
            <Github aria-hidden="true" />
            Repo-ready
          </span>
        </div>
      </aside>
      <div className="workspace">{children}</div>
    </div>
  );
}


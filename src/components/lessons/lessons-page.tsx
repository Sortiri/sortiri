"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { CreateLessonModal } from "@/components/lessons/create-lesson-modal";
import { useWorkspace } from "@/components/workspace/workspace-context";
import { useWorkspaceMembership } from "@/hooks/use-workspace-membership";
import { PageLoader } from "@/components/ui/page-loader";
import {
  LESSON_TYPE_LABELS,
  type LessonRecord,
  type LessonType,
} from "@/types/lessons";
import "./lessons.css";

const FILTER_OPTIONS: Array<{ id: "all" | LessonType; label: string }> = [
  { id: "all", label: "All" },
  { id: "positive_pattern", label: "Positive" },
  { id: "negative_pattern", label: "Negative" },
  { id: "validation", label: "Validation" },
  { id: "product_learning", label: "Product" },
  { id: "revenue_learning", label: "Revenue" },
  { id: "engineering_learning", label: "Engineering" },
  { id: "security_learning", label: "Security" },
  { id: "process_learning", label: "Process" },
];

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(timestamp),
  );
}

export function LessonsPage() {
  const router = useRouter();
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const { capabilities } = useWorkspaceMembership(activeWorkspaceId);
  const canWrite = capabilities?.canWriteWorkspaceData ?? false;
  const [filter, setFilter] = useState<"all" | LessonType>("all");
  const [showCreate, setShowCreate] = useState(false);

  const lessons = useQuery(
    api.lessons.listByWorkspace,
    activeWorkspaceId
      ? {
          workspaceId: activeWorkspaceId,
          type: filter === "all" ? undefined : filter,
        }
      : "skip",
  );

  const loading = wsLoading || (activeWorkspaceId !== null && lessons === undefined);
  const lessonList = useMemo(
    () => (lessons ?? []).filter((l) => l.status !== "archived") as LessonRecord[],
    [lessons],
  );

  return (
    <div className="lessons-page">
      <header className="lessons-page__header-row">
        <div>
          <h1 className="lessons-page__title">Lessons</h1>
          <p className="lessons-page__subtitle">
            Evidence-backed learnings from impact analyses, decisions, and failures.
          </p>
        </div>
        {canWrite && activeWorkspaceId ? (
          <button
            type="button"
            className="lessons-page__action"
            onClick={() => setShowCreate(true)}
          >
            Create Lesson
          </button>
        ) : null}
      </header>

      <div className="lessons-filter-chips">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`lessons-filter-chip${filter === option.id ? " lessons-filter-chip--active" : ""}`}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? <PageLoader variant="inline" /> : null}

      {!loading && lessonList.length === 0 ? (
        <p className="lessons-page__subtitle">
          {canWrite
            ? "No lessons yet. Generate from impact analysis or create one manually."
            : "No lessons available."}
        </p>
      ) : null}

      {lessonList.length > 0 ? (
        <table className="lessons-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Confidence</th>
              <th>Source</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {lessonList.map((lesson) => (
              <tr key={lesson.id}>
                <td>
                  <span className="lessons-badge">{LESSON_TYPE_LABELS[lesson.type]}</span>
                </td>
                <td>
                  <Link href={`/lessons/${lesson.id}`}>{lesson.title}</Link>
                  <p className="lessons-page__subtitle">{lesson.summary}</p>
                </td>
                <td>{lesson.confidence}</td>
                <td>{lesson.source}</td>
                <td>{formatDate(lesson.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {showCreate && activeWorkspaceId ? (
        <CreateLessonModal
          workspaceId={activeWorkspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={(lessonId) => {
            setShowCreate(false);
            router.push(`/lessons/${lessonId}`);
          }}
        />
      ) : null}
    </div>
  );
}

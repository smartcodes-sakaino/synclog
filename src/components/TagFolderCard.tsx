"use client";

import { useState } from "react";
import { tagColorClasses } from "@/lib/tagColors";
import type { Task } from "@/types";

const TAG_ICONS: Record<string, string> = {
  primary: "code",
  secondary: "groups",
  tertiary: "palette",
  peach: "receipt_long",
  gray: "search",
};

export default function TagFolderCard({
  tagName,
  colorKey,
  tasks,
  onToggleDone,
  onSelectTask,
}: {
  tagName: string;
  colorKey: string;
  tasks: Task[];
  onToggleDone: (taskId: string, done: boolean) => void;
  onSelectTask: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const colors = tagColorClasses(colorKey);
  const icon = TAG_ICONS[colorKey] ?? "label";
  const visibleTasks = open ? tasks : tasks.slice(0, 1);
  const hasMore = tasks.length > 1;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 card-shadow border border-outline-variant/20">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text}`}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <span className="font-body-lg text-body-lg text-on-surface font-bold">{tagName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${colors.bg} ${colors.text} font-label-sm text-label-sm px-2 py-1 rounded-full`}>
            {tasks.length}件
          </span>
          {hasMore && (
            <span
              className="material-symbols-outlined text-on-surface-variant transition-transform"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              expand_more
            </span>
          )}
        </div>
      </button>
      <div className="flex flex-col gap-2 mt-4">
        {visibleTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-low transition-colors">
            <input
              type="checkbox"
              className="cute-checkbox"
              checked={task.status === "done"}
              onChange={(e) => onToggleDone(task.id, e.target.checked)}
            />
            <button
              type="button"
              onClick={() => onSelectTask(task)}
              className="flex-1 min-w-0 text-left"
            >
              <p className={`text-body-md text-on-surface truncate ${task.status === "done" ? "line-through opacity-60" : ""}`}>
                {task.title}
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {task.due_date ? task.due_date : "期限なし"}・{task.priority === "high" ? "高優先" : task.priority === "low" ? "低優先" : "中優先"}
              </p>
            </button>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-label-sm text-on-surface-variant py-2">タスクはありません</p>
        )}
      </div>
    </div>
  );
}

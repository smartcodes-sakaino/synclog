"use client";

import { tagColorClasses } from "@/lib/tagColors";
import type { Task } from "@/types";

const TAG_ICONS: Record<string, string> = {
  primary: "code",
  secondary: "groups",
  tertiary: "palette",
  peach: "receipt_long",
  gray: "search",
};

const PRIORITY_BORDER: Record<Task["priority"], string> = {
  high: "border-error/40",
  medium: "border-outline-variant/30",
  low: "border-outline-variant/20",
};

export default function TagFolderCard({
  tagName,
  colorKey,
  tasks,
  onToggleDone,
  onSelectTask,
  dragHandleProps,
}: {
  tagName: string;
  colorKey: string;
  tasks: Task[];
  onToggleDone: (taskId: string, done: boolean) => void;
  onSelectTask: (task: Task) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}) {
  const colors = tagColorClasses(colorKey);
  const icon = TAG_ICONS[colorKey] ?? "label";

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 card-shadow border border-outline-variant/20 h-full flex flex-col">
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {dragHandleProps && (
            <span
              {...dragHandleProps}
              className="material-symbols-outlined text-outline-variant cursor-grab active:cursor-grabbing"
            >
              drag_indicator
            </span>
          )}
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text} flex-shrink-0`}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <span className="font-body-lg text-body-lg text-on-surface font-bold truncate">{tagName}</span>
        </div>
        <span className={`${colors.bg} ${colors.text} font-label-sm text-label-sm px-2 py-1 rounded-full flex-shrink-0`}>
          {tasks.length}件
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 p-3 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${PRIORITY_BORDER[task.priority]} ${
              task.status === "in_progress" ? "bg-secondary-container/20" : "bg-surface-container-lowest"
            } ${task.status === "done" ? "opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              className="cute-checkbox"
              checked={task.status === "done"}
              onChange={(e) => onToggleDone(task.id, e.target.checked)}
            />
            <button type="button" onClick={() => onSelectTask(task)} className="flex-1 min-w-0 text-left">
              <p className={`text-body-md text-on-surface truncate ${task.status === "done" ? "line-through" : ""}`}>
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

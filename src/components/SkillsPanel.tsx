"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { Skill } from "@/types";

export default function SkillsPanel({ initialSkills }: { initialSkills: Skill[] }) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [newSkillTitle, setNewSkillTitle] = useState("");
  const [newSkillYears, setNewSkillYears] = useState("");
  const [newExperienceTitle, setNewExperienceTitle] = useState("");
  const [newExperienceDesc, setNewExperienceDesc] = useState("");
  const [resume, setResume] = useState<string | null>(null);
  const [generatingResume, setGeneratingResume] = useState(false);

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillTitle, setEditSkillTitle] = useState("");
  const [editSkillYears, setEditSkillYears] = useState("");

  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [editExperienceTitle, setEditExperienceTitle] = useState("");
  const [editExperienceDesc, setEditExperienceDesc] = useState("");

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { showToast } = useToast();

  async function load() {
    try {
      const data = await apiFetch<{ skills: Skill[] }>("/api/skills");
      setSkills(data.skills ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "取得に失敗しました");
    }
  }

  async function addSkill() {
    if (!newSkillTitle.trim()) return;
    const years = newSkillYears.trim() ? Number(newSkillYears) : undefined;
    try {
      await apiFetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "skill", title: newSkillTitle, years }),
      });
      setNewSkillTitle("");
      setNewSkillYears("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "追加に失敗しました");
    }
  }

  async function addExperience() {
    if (!newExperienceTitle.trim()) return;
    try {
      await apiFetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "experience",
          title: newExperienceTitle,
          description: newExperienceDesc || undefined,
        }),
      });
      setNewExperienceTitle("");
      setNewExperienceDesc("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "追加に失敗しました");
    }
  }

  async function removeSkill(id: string) {
    try {
      await apiFetch(`/api/skills/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  function startEditSkill(skill: Skill) {
    setEditingSkillId(skill.id);
    setEditSkillTitle(skill.title);
    setEditSkillYears(skill.years != null ? String(skill.years) : "");
  }

  async function saveEditSkill(id: string) {
    if (!editSkillTitle.trim()) return;
    try {
      await apiFetch(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editSkillTitle,
          years: editSkillYears.trim() ? Number(editSkillYears) : null,
        }),
      });
      setEditingSkillId(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  function startEditExperience(exp: Skill) {
    setEditingExperienceId(exp.id);
    setEditExperienceTitle(exp.title);
    setEditExperienceDesc(exp.description ?? "");
  }

  async function saveEditExperience(id: string) {
    if (!editExperienceTitle.trim()) return;
    try {
      await apiFetch(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editExperienceTitle,
          description: editExperienceDesc || null,
        }),
      });
      setEditingExperienceId(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  async function persistOrder(items: Skill[]) {
    try {
      await apiFetch("/api/skills/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillIds: items.map((i) => i.id) }),
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "並び替えの保存に失敗しました");
      load();
    }
  }

  function handleDrop(category: "skill" | "experience", targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setSkills((prev) => {
      const items = prev.filter((s) => s.category === category);
      const others = prev.filter((s) => s.category !== category);
      const fromIndex = items.findIndex((s) => s.id === draggedId);
      const toIndex = items.findIndex((s) => s.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      persistOrder(items);
      return category === "skill" ? [...items, ...others] : [...others, ...items];
    });
    setDraggedId(null);
  }

  async function handleGenerateResume() {
    setGeneratingResume(true);
    try {
      const data = await apiFetch<{ resume: string }>("/api/skills/resume", { method: "POST" });
      setResume(data.resume);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      setGeneratingResume(false);
    }
  }

  async function copyResume() {
    if (resume) {
      await navigator.clipboard.writeText(resume);
      showToast("コピーしました", "success");
    }
  }

  const skillItems = skills.filter((s) => s.category === "skill");
  const experienceItems = skills.filter((s) => s.category === "experience");

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto p-6">
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">military_tech</span>スキル
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {skillItems.map((s) =>
            editingSkillId === s.id ? (
              <div key={s.id} className="flex items-center gap-1 bg-surface-container-low rounded-full pl-2 pr-1 py-1">
                <input
                  value={editSkillTitle}
                  onChange={(e) => setEditSkillTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEditSkill(s.id)}
                  className="w-24 bg-white border border-outline-variant/40 rounded-full px-2 py-0.5 text-sm"
                  autoFocus
                />
                <input
                  value={editSkillYears}
                  onChange={(e) => setEditSkillYears(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveEditSkill(s.id)}
                  type="number"
                  min={0}
                  max={80}
                  step={0.5}
                  placeholder="年数"
                  className="w-14 bg-white border border-outline-variant/40 rounded-full px-2 py-0.5 text-sm"
                />
                <button onClick={() => saveEditSkill(s.id)} className="text-primary">
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </button>
                <button onClick={() => setEditingSkillId(null)} className="text-on-surface-variant/60">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            ) : (
              <span
                key={s.id}
                draggable
                onDragStart={() => setDraggedId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop("skill", s.id)}
                onClick={() => startEditSkill(s)}
                className={`group flex items-center gap-1 bg-primary-container text-on-primary-container rounded-full pl-3 pr-1.5 py-1 text-sm font-bold cursor-move ${draggedId === s.id ? "opacity-40" : ""}`}
              >
                {s.title}
                {s.years != null && <span className="opacity-70 font-normal">({s.years}年)</span>}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSkill(s.id);
                  }}
                  className="opacity-60 hover:opacity-100"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </span>
            )
          )}
          {skillItems.length === 0 && <p className="text-sm text-on-surface-variant">まだありません</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={newSkillTitle}
            onChange={(e) => setNewSkillTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSkill()}
            placeholder="例: Next.js"
            className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={newSkillYears}
            onChange={(e) => setNewSkillYears(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSkill()}
            type="number"
            min={0}
            max={80}
            step={0.5}
            placeholder="年数"
            className="w-20 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={addSkill} className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold">
            追加
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">work</span>職務経歴
        </h3>
        <div className="flex flex-col gap-2 mb-3">
          {experienceItems.map((e) =>
            editingExperienceId === e.id ? (
              <div key={e.id} className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2">
                <input
                  value={editExperienceTitle}
                  onChange={(ev) => setEditExperienceTitle(ev.target.value)}
                  className="bg-white border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
                <input
                  value={editExperienceDesc}
                  onChange={(ev) => setEditExperienceDesc(ev.target.value)}
                  placeholder="概要(任意)"
                  className="bg-white border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditingExperienceId(null)}
                    className="text-on-surface-variant text-xs font-bold"
                  >
                    キャンセル
                  </button>
                  <button onClick={() => saveEditExperience(e.id)} className="text-primary text-xs font-bold">
                    保存する
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={e.id}
                draggable
                onDragStart={() => setDraggedId(e.id)}
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={() => handleDrop("experience", e.id)}
                onClick={() => startEditExperience(e)}
                className={`bg-surface-container-low rounded-lg p-3 flex items-start justify-between gap-2 cursor-move ${draggedId === e.id ? "opacity-40" : ""}`}
              >
                <div>
                  <p className="font-bold text-on-surface text-sm">{e.title}</p>
                  {e.description && <p className="text-xs text-on-surface-variant mt-0.5">{e.description}</p>}
                </div>
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    removeSkill(e.id);
                  }}
                  className="text-on-surface-variant/60 hover:text-error flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            )
          )}
          {experienceItems.length === 0 && <p className="text-sm text-on-surface-variant">まだありません</p>}
        </div>
        <div className="flex flex-col gap-2">
          <input
            value={newExperienceTitle}
            onChange={(e) => setNewExperienceTitle(e.target.value)}
            placeholder="例: 株式会社テクノデジタル 営業"
            className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              value={newExperienceDesc}
              onChange={(e) => setNewExperienceDesc(e.target.value)}
              placeholder="概要(任意)"
              className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={addExperience} className="bg-secondary text-on-secondary rounded-lg px-4 py-2 text-sm font-bold">
              追加
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-outline-variant/20">
        <button
          onClick={handleGenerateResume}
          disabled={generatingResume}
          className="w-full bg-tertiary text-on-tertiary rounded-lg py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          {generatingResume ? "生成中..." : "職務経歴書を生成"}
        </button>
        {resume && (
          <div className="mt-3 bg-surface-container-low rounded-lg p-4 text-sm whitespace-pre-line max-h-64 overflow-y-auto">
            {resume}
            <button onClick={copyResume} className="mt-3 text-primary text-xs font-bold hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">content_copy</span>コピーする
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { Skill } from "@/types";

export default function SkillsPanel({ initialSkills }: { initialSkills: Skill[] }) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [newSkillTitle, setNewSkillTitle] = useState("");
  const [newExperienceTitle, setNewExperienceTitle] = useState("");
  const [newExperienceDesc, setNewExperienceDesc] = useState("");
  const [resume, setResume] = useState<string | null>(null);
  const [generatingResume, setGeneratingResume] = useState(false);
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
    try {
      await apiFetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "skill", title: newSkillTitle }),
      });
      setNewSkillTitle("");
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
          {skillItems.map((s) => (
            <span
              key={s.id}
              className="group flex items-center gap-1 bg-primary-container text-on-primary-container rounded-full pl-3 pr-1.5 py-1 text-sm font-bold"
            >
              {s.title}
              <button onClick={() => removeSkill(s.id)} className="opacity-60 hover:opacity-100">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </span>
          ))}
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
          {experienceItems.map((e) => (
            <div key={e.id} className="bg-surface-container-low rounded-lg p-3 flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-on-surface text-sm">{e.title}</p>
                {e.description && <p className="text-xs text-on-surface-variant mt-0.5">{e.description}</p>}
              </div>
              <button onClick={() => removeSkill(e.id)} className="text-on-surface-variant/60 hover:text-error flex-shrink-0">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          ))}
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

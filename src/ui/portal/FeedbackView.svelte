<script lang="ts">
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 thetommylong

  import { runtime } from "../../adapters/runtime.svelte";
  import type {
    StudentFeedbackLecturerResult,
    FeedbackQuestionResponse,
    FeedbackAnswerUpdate,
    FeedbackCommentUpdate,
    FeedbackStatusUpdate,
  } from "../../types/portal";
  import { notify } from "../../notifications";

  let { studentId }: { studentId: string } = $props();

  // List state
  let pending = $state<StudentFeedbackLecturerResult[]>([]);
  let submitted = $state<StudentFeedbackLecturerResult[]>([]);
  let loading = $state(false);

  // Form state
  let active: StudentFeedbackLecturerResult | null = $state(null);
  let formRow: StudentFeedbackLecturerResult | null = $state(null);
  let answers = $state<Record<number, string>>({});
  let comment1 = $state<string>("");
  let comment2 = $state<string>("");
  let submitting = $state(false);

  let dialogEl = $state<HTMLDialogElement>();
  let lastTrigger = $state<HTMLElement>();

  $effect(() => {
    const el = dialogEl;
    if (!el) return;
    if (active && !el.open) el.showModal();
    else if (!active && el.open) el.close();
  });

  // Derived
  const sortedPending = $derived(
    [...pending].sort(
      (a, b) =>
        a.subjectName.localeCompare(b.subjectName) || a.description.localeCompare(b.description),
    ),
  );

  const sortedSubmitted = $derived(
    [...submitted].sort(
      (a, b) =>
        a.subjectName.localeCompare(b.subjectName) || a.description.localeCompare(b.description),
    ),
  );

  

  async function load(): Promise<void> {
    loading = true;
    try {
      const data = await runtime.adapter.getFeedbackStatus(studentId);
      pending = data.unDoneFeedbacks;
      submitted = data.feedbacks;
    } catch {
      notify("Failed to load feedback", "error");
    } finally {
      loading = false;
    }
  }

  export function refresh(): void {
    void load();
  }

  void load();

  async function openForm(row: StudentFeedbackLecturerResult): Promise<void> {
    lastTrigger = document.activeElement as HTMLElement;
    active = row;
    try {
      if (row.termId === "FAKE") {
        formRow = row;
      } else {
        const rows = await runtime.adapter.getUnfinishedFeedbacks(
          row.termId,
          studentId,
        );
        const found = rows.find((r) => r.feedbackLecturerId === row.feedbackLecturerId);
        if (!found) throw new Error("Row not found");
        formRow = found;
      }
      answers = {};
      for (const [key, val] of Object.entries(formRow.chosenAnswers ?? {})) {
        answers[Number(key)] = val;
      }
      comment1 = formRow.comment1 ?? "";
      comment2 = formRow.comment2 ?? "";
    } catch {
      notify("Failed to open feedback form", "error");
      active = null;
    }
  }

  function pickAnswer(qOrder: number, feedbackAnswerId: string): void {
    answers = { ...answers, [qOrder]: feedbackAnswerId };
    notify("Cập nhật câu trả lời", "success");
  }

  async function saveComment(slot: 1 | 2, value: string): Promise<void> {
    if (slot === 1) comment1 = value;
    else comment2 = value;
    if (active?.termId === "FAKE") return;
    if (!runtime.adapter.features.supportsMutations) return;
    try {
      await runtime.adapter.updateFeedbackComment(slot, { feedbackLecturerId: active?.feedbackLecturerId ?? "", studentId: studentId ?? "", comment: value });
    } catch {
      notify("Lưu nhận xét thất bại", "error");
    }
  }

  const canFinish = $derived.by(() => {
    if (!formRow?.questions?.length) return false;
    const allAnswered = Object.keys(answers).length >= formRow.questions.length;
    return allAnswered && (comment1.trim().length > 0 || comment2.trim().length > 0);
  });

  function discardForm(): void {
    active = null;
    formRow = null;
    answers = {};
    comment1 = "";
    comment2 = "";
  }

  async function finish(): Promise<void> {
    if (!canFinish || submitting || !formRow) return;
    submitting = true;
    try {
      if (!runtime.adapter.features.supportsMutations) return;
      await runtime.adapter.updateFeedbackStatus({ feedbackLecturerId: formRow.feedbackLecturerId, studentId: studentId ?? "", status: true });
      notify("Phản hồi đã gửi", "success");
      discardForm();
      requestAnimationFrame(() => lastTrigger?.focus());
      await load();
    } catch {
      notify("Gửi phản hồi thất bại", "error");
    } finally {
      submitting = false;
    }
  }

  function closeForm(): void {
    discardForm();
    requestAnimationFrame(() => lastTrigger?.focus());
    void load();
  }

  function onDialogClose(): void {
    if (active) closeForm();
  }
</script>

<div class="feedback">
  <div class="feedback-body">
    {#if loading}
      <p class="feedback-empty" role="status">Loading…</p>
    {:else if pending.length === 0 && submitted.length === 0}
      <p class="feedback-empty">No feedback published yet</p>
    {:else}
      {#if pending.length > 0}
        <h2 class="feedback-group-title" id="fb-pending">Chưa gửi ({pending.length})</h2>
        <ul class="feedback-list" aria-labelledby="fb-pending">
          {#each sortedPending as f (f.feedbackLecturerId)}
            <li class="fb-card-wrapper">
              <button
                class="fb-card fb-card-muted fb-card-button"
                onclick={() => openForm(f)}
                aria-label={`Phản hồi cho ${f.subjectName} (Chưa gửi)`}
              >
              <header class="fb-card-head">
                <div class="fb-card-titlewrap">
                  <h3 class="fb-card-title">{f.subjectName}</h3>
                  <p class="fb-card-sub">{f.description || f.className}</p>
                </div>
                <span class="fb-badge fb-badge-pending">Chưa gửi</span>
              </header>
              <section class="mark-section">
                <span class="mark-label">GV</span>
                <span class="fb-text">{f.lecturerName || "—"}</span>
              </section>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if submitted.length > 0}
        <h2 class="feedback-group-title" id="fb-done">Đã gửi ({submitted.length})</h2>
        <ul class="feedback-list" aria-labelledby="fb-done">
          {#each sortedSubmitted as f}
            <li class="fb-card">
              <header class="fb-card-head">
                <div class="fb-card-titlewrap">
                  <h3 class="fb-card-title">{f.subjectName}</h3>
                  <p class="fb-card-sub">{f.description || f.className}</p>
                </div>
                <span class="fb-badge fb-badge-done">Đã gửi</span>
              </header>
              <section class="mark-section">
                <span class="mark-label">GV</span>
                <span class="fb-text">{f.lecturerName || "—"}</span>
              </section>
              {#if f.comment1}
                <section class="mark-section">
                  <span class="mark-label">GK1</span>
                  <span class="fb-text">{f.comment1}</span>
                </section>
              {/if}
              {#if f.comment2}
                <section class="mark-section">
                  <span class="mark-label">GK2</span>
                  <span class="fb-text">{f.comment2}</span>
                </section>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
</div>

<dialog
  class="fb-dialog"
  bind:this={dialogEl}
  onclose={onDialogClose}
  aria-label="Biểu mẫu phản hồi"
>
  {#if active && formRow}
    <header class="fb-card-head fb-dialog-head">
      <div class="fb-card-titlewrap">
        <h3 class="fb-card-title">{active.subjectName}</h3>
        <p class="fb-card-sub">{active.description || active.className}</p>
      </div>
      <button class="fb-close-btn" aria-label="Đóng" onclick={closeForm} disabled={submitting}>&times;</button>
    </header>

    <div class="fb-dialog-body">
      <section class="fb-q-list">
        {#each formRow.questions ?? [] as q (q.feedbackQuestion.feedbackQuestionId)}
          <div class="fb-q-card">
            <h4 class="fb-q-title">{q.feedbackQuestion.content || `Câu ${q.feedbackQuestion.order}`}</h4>
            <div class="fb-answers">
              {#each q.feedbackAnswers ?? [] as a (a.feedbackAnswerId)}
                <button
                  class={`fb-opt ${answers[q.feedbackQuestion.order ?? 0] === a.feedbackAnswerId ? "fb-opt-selected" : ""} fb-opt-${a.order ?? 0}`}
                  onclick={() => pickAnswer(q.feedbackQuestion.order ?? 0, a.feedbackAnswerId)}
                  aria-pressed={answers[q.feedbackQuestion.order ?? 0] === a.feedbackAnswerId}
                  aria-label={`Câu ${q.feedbackQuestion.order}: ${a.content || String(a.order)}`}
                >
                  {a.content || String(a.order)}
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </section>

      <section class="fb-comments">
        <label class="fb-label" for="fb-comment1">GK1</label>
        <textarea
          id="fb-comment1"
          class="fb-textarea"
          rows="2"
          placeholder="Ghi nhận nhận xét về giảng viên"
          bind:value={comment1}
          onblur={() => saveComment(1, comment1)}
        ></textarea>
        <label class="fb-label" for="fb-comment2">GK2</label>
        <textarea
          id="fb-comment2"
          class="fb-textarea"
          rows="2"
          placeholder="Ghi nhận nhận xét khác"
          bind:value={comment2}
          onblur={() => saveComment(2, comment2)}
        ></textarea>
      </section>
    </div>

    <footer class="fb-actions">
      {#if canFinish}
        <button class="btn-primary" onclick={finish} disabled={submitting}>{submitting ? "Đang gửi…" : "Gửi phản hồi"}</button>
      {:else}
        <span class="fb-disabled">Vui lòng trả lời tất cả câu hỏi và ghi nhận ít nhất một nhận xét</span>
      {/if}
      <button class="btn-secondary" onclick={closeForm} disabled={submitting}>{submitting ? "Đang đóng…" : "Huỷ"}</button>
    </footer>
  {/if}
</dialog>

<style>
  :global(.fb-dialog) {
    border: none;
    border-radius: 12px;
    padding: 14px 16px;
    width: min(620px, 94vw);
    max-height: 86vh;
    background: var(--base);
    color: var(--text);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  }

  :global(.fb-dialog[open]) {
    animation: dialog-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  :global(.fb-dialog::backdrop) {
    background: rgba(0, 0, 0, 0.5);
    animation: backdrop-in 0.2s ease-out both;
  }

  .fb-dialog-head {
    margin-bottom: 10px;
  }

  .fb-dialog-body {
    overflow-y: auto;
    max-height: calc(86vh - 130px);
  }

  .fb-close-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    color: inherit;
  }

  .fb-q-card {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--text) 8%, transparent);
  }

  .fb-q-title {
    margin: 0 0 6px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .fb-answers .fb-opt {
    display: inline-block;
    margin-right: 6px;
    padding: 4px 8px;
    font-size: 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
  }

  .fb-opt-selected {
    background: var(--surface0);
    border-color: var(--accent);
    color: var(--accent);
  }

  .fb-opt-1,
  .fb-opt-2,
  .fb-opt-3,
  .fb-opt-4,
  .fb-opt-5 {
    background: var(--base);
    color: var(--subtext0);
  }

  .fb-comments .fb-label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--subtext0);
  }

  .fb-textarea {
    width: 100%;
    padding: 6px 8px;
    font-family: "Google Sans Flex", system-ui, sans-serif;
    font-size: 13px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface0);
    color: var(--text);
    resize: vertical;
    min-height: 36px;
  }

  .fb-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .fb-disabled {
    color: var(--subtext0);
    pointer-events: none;
  }

  .btn-primary {
    flex: 1;
    padding: 8px 16px;
    background: var(--accent);
    color: var(--base);
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-primary:disabled {
    background: color-mix(in srgb, var(--accent) 40%, transparent);
    cursor: not-allowed;
  }

  .btn-secondary {
    flex: 1;
    padding: 8px 16px;
    background: var(--surface0);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>

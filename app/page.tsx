"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Member = { id: number; name: string };
type Plan = {
  id: number;
  authorId: number;
  authorName: string;
  title: string;
  details: string;
  dueDate: string;
  status: "pending" | "approved";
  fine: number;
  createdAt: string;
};
type Session = { roomCode: string; member: Member };

const won = new Intl.NumberFormat("ko-KR");

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [tab, setTab] = useState<"all" | "mine" | "friend">("all");
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/session")
      .then(async (response) => response.ok ? setSession(await response.json()) : undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadPlans();
  }, [session]);

  async function loadPlans() {
    if (!session) return;
    const response = await fetch("/api/plans");
    if (!response.ok) return;
    const data = await response.json();
    setPlans(data.plans);
    setMembers(data.members);
  }

  function enter(next: Session) {
    setSession(next);
  }

  async function approve(id: number) {
    if (!session) return;
    const response = await fetch(`/api/plans/${id}/approve`, {
      method: "POST",
    });
    if (response.ok) {
      await loadPlans();
      showToast("계획을 승인했어요");
    }
  }

  async function deletePlan(plan: Plan) {
    if (!window.confirm(`“${plan.title}” 계획을 삭제할까요?\n삭제한 계획은 복구할 수 없어요.`)) return;
    const response = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
    if (response.ok) {
      await loadPlans();
      showToast("계획을 삭제했어요");
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  const visiblePlans = useMemo(() => {
    if (!session) return [];
    if (tab === "mine") return plans.filter((plan) => plan.authorId === session.member.id);
    if (tab === "friend") return plans.filter((plan) => plan.authorId !== session.member.id);
    return plans;
  }, [plans, session, tab]);

  if (loading) return <main className="center-screen"><div className="spinner" /></main>;
  if (!session) return <Onboarding onEnter={enter} />;

  const friend = members.find((member) => member.id !== session.member.id);
  const pendingForMe = plans.filter(
    (plan) => plan.authorId !== session.member.id && plan.status === "pending",
  ).length;
  const approved = plans.filter((plan) => plan.status === "approved").length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="약속메이트 홈">
          <span className="brand-mark">✓</span>
          <span>약속메이트</span>
        </a>
        <div className="header-actions">
          <span className="room-chip">방 코드&nbsp; {session.roomCode}</span>
          <NotificationControl />
          <button className="avatar" onClick={() => { window.location.href = "/signout-with-chatgpt?return_to=%2F"; }} title="로그아웃" aria-label="로그아웃">
            {session.member.name.slice(0, 1)}
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">{friend ? `${session.member.name} × ${friend.name}` : "친구를 기다리는 중"}</p>
          <h1>같이 정한 약속은<br />끝까지 지켜봐요.</h1>
          <p className="hero-copy">계획을 올리고 친구의 승인을 받아요.<br />못 지키면 약속한 벌금은 10,000원!</p>
        </div>
        <div className="hero-card">
          <span className="hero-card-label">이번 약속 현황</span>
          <strong>{approved}<small>개 승인 완료</small></strong>
          <div className="progress-track"><span style={{ width: `${plans.length ? (approved / plans.length) * 100 : 0}%` }} /></div>
          <p>{pendingForMe ? `내 확인을 기다리는 계획 ${pendingForMe}개` : "확인할 계획이 없어요"}</p>
        </div>
      </section>

      {!friend && (
        <section className="invite-banner">
          <div><span className="mini-icon">↗</span><div><strong>친구를 초대해 주세요</strong><p>방 코드 <b>{session.roomCode}</b>를 친구에게 보내면 함께 시작할 수 있어요.</p></div></div>
          <button onClick={() => { navigator.clipboard.writeText(session.roomCode); showToast("방 코드를 복사했어요"); }}>코드 복사</button>
        </section>
      )}

      <section className="content-section">
        <div className="section-heading">
          <div><p className="eyebrow dark">OUR PLANS</p><h2>우리의 계획</h2></div>
          <button className="primary-button" onClick={() => setShowCreate(true)}><span>＋</span> 새 계획</button>
        </div>

        <div className="tabs" role="tablist" aria-label="계획 필터">
          {([['all', '전체'], ['mine', '내 계획'], ['friend', '친구 계획']] as const).map(([value, label]) => (
            <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{label}</button>
          ))}
        </div>

        <div className="plan-grid">
          {visiblePlans.map((plan) => {
            const mine = plan.authorId === session.member.id;
            return (
              <article className={`plan-card ${plan.status}`} key={plan.id}>
                <div className="plan-topline">
                  <span className={`status ${plan.status}`}>{plan.status === "approved" ? "✓ 승인 완료" : "● 승인 대기"}</span>
                  <div className="plan-top-actions">
                    <span className="fine">실패 시 {won.format(plan.fine)}원</span>
                    {mine && <span className="owner-actions"><button onClick={() => setEditingPlan(plan)} aria-label={`${plan.title} 수정`}>수정</button><button onClick={() => void deletePlan(plan)} aria-label={`${plan.title} 삭제`}>삭제</button></span>}
                  </div>
                </div>
                <h3>{plan.title}</h3>
                <p className="details">{plan.details || "상세 내용 없이 등록된 계획이에요."}</p>
                <div className="plan-meta">
                  <span><b>기한</b>{plan.dueDate}</span>
                  <span><b>작성</b>{mine ? "나" : plan.authorName}</span>
                </div>
                {plan.status === "pending" && !mine ? (
                  <button className="approve-button" onClick={() => approve(plan.id)}>이 계획 승인하기 <span>→</span></button>
                ) : (
                  <div className="card-footer">{plan.status === "approved" ? "서로 확인한 약속이에요" : "친구의 확인을 기다리고 있어요"}</div>
                )}
              </article>
            );
          })}
          {!visiblePlans.length && (
            <div className="empty-state">
              <span>✦</span><h3>아직 등록된 계획이 없어요</h3><p>첫 계획을 만들고 친구와 약속해 보세요.</p>
              <button onClick={() => setShowCreate(true)}>첫 계획 만들기</button>
            </div>
          )}
        </div>
      </section>

      <footer><span>약속메이트</span><p>같이 하면, 조금 더 오래 갈 수 있으니까.</p></footer>
      {showCreate && <CreatePlan session={session} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void loadPlans(); showToast("계획을 등록했어요"); }} />}
      {editingPlan && <EditPlan plan={editingPlan} onClose={() => setEditingPlan(null)} onSaved={() => { setEditingPlan(null); void loadPlans(); showToast("계획을 수정했어요. 친구의 재승인을 기다려요"); }} />}
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function Onboarding({ onEnter }: { onEnter: (session: Session) => void }) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, name, inviteCode: code }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setError(data.error || "잠시 후 다시 시도해 주세요."); return; }
    onEnter(data);
  }

  return (
    <main className="onboarding">
      <section className="onboarding-copy">
        <a className="brand light" href="#"><span className="brand-mark">✓</span><span>약속메이트</span></a>
        <div className="onboarding-message"><p className="eyebrow">TOGETHER, WE DO</p><h1>친구와 함께라면<br />계획이 약속이 돼요.</h1><p>서로의 계획을 확인하고 승인해 주세요.<br />지키지 못한 약속의 벌금은 10,000원이에요.</p></div>
        <div className="promise-list"><span>01&nbsp; 계획 올리기</span><span>02&nbsp; 친구 승인</span><span>03&nbsp; 함께 실천</span></div>
      </section>
      <section className="onboarding-form-wrap">
        <form className="onboarding-form" onSubmit={submit}>
          <p className="eyebrow dark">START TOGETHER</p><h2>{mode === "create" ? "우리만의 방 만들기" : "친구의 방에 들어가기"}</h2><p className="form-lead">{mode === "create" ? "먼저 방을 만들고 초대 코드를 친구에게 보내세요." : "친구에게 받은 6자리 방 코드를 입력하세요."}</p>
          <label>내 이름<input required maxLength={10} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 민수" /></label>
          {mode === "join" && <label>방 코드<input required maxLength={6} className="code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" /></label>}
          {error && <p className="form-error">{error}</p>}
          <button className="submit-button" disabled={busy}>{busy ? "잠시만요..." : mode === "create" ? "방 만들고 시작하기" : "친구와 시작하기"}</button>
          <button type="button" className="mode-switch" onClick={() => { setMode(mode === "create" ? "join" : "create"); setError(""); }}>{mode === "create" ? "이미 방 코드가 있나요?  들어가기 →" : "처음 시작하나요?  방 만들기 →"}</button>
        </form>
      </section>
    </main>
  );
}

function CreatePlan({ session, onClose, onCreated }: { session: Session; onClose: () => void; onCreated: () => void }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    setBusy(false); if (response.ok) onCreated();
  }
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <p className="eyebrow dark">NEW PROMISE</p><h2>새 계획 만들기</h2><p>친구가 승인하면 둘만의 약속이 돼요.</p>
        <label>계획 이름<input name="title" required maxLength={50} placeholder="예: 주 3회 헬스 가기" autoFocus /></label>
        <label>구체적인 내용<textarea name="details" maxLength={180} placeholder="언제, 얼마나 할지 적어주세요." rows={3} /></label>
        <label>기한<input name="dueDate" type="date" required /></label>
        <div className="fixed-fine"><span>실패 시 벌금</span><strong>10,000원</strong><small>고정</small></div>
        <button className="submit-button" disabled={busy}>{busy ? "등록 중..." : "친구에게 승인 요청하기"}</button>
      </form>
    </div>
  );
}

function EditPlan({ plan, onClose, onSaved }: { plan: Plan; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/plans/${plan.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    setBusy(false);
    if (response.ok) onSaved();
    else setError((await response.json()).error || "수정하지 못했어요.");
  }
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <p className="eyebrow dark">EDIT PROMISE</p><h2>계획 수정하기</h2><p>내용을 바꾸면 친구의 승인을 다시 받아요.</p>
        <label>계획 이름<input name="title" required maxLength={50} defaultValue={plan.title} autoFocus /></label>
        <label>구체적인 내용<textarea name="details" maxLength={180} defaultValue={plan.details} rows={3} /></label>
        <label>기한<input name="dueDate" type="date" required defaultValue={plan.dueDate} /></label>
        <div className="fixed-fine"><span>실패 시 벌금</span><strong>10,000원</strong><small>고정</small></div>
        {error && <p className="form-error">{error}</p>}
        <button className="submit-button" disabled={busy}>{busy ? "수정 중..." : "수정하고 다시 승인 요청하기"}</button>
      </form>
    </div>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function NotificationControl() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setSupported(false); setBusy(false); return;
    }
    navigator.serviceWorker.register("/sw.js")
      .then(async () => {
        const ready = await navigator.serviceWorker.ready;
        setRegistration(ready);
        setEnabled(Boolean(await ready.pushManager.getSubscription()));
      })
      .catch(() => setSupported(false))
      .finally(() => setBusy(false));
  }, []);

  async function toggle() {
    if (!registration || busy) return;
    setBusy(true);
    try {
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        const endpoint = existing.endpoint;
        await existing.unsubscribe();
        await fetch("/api/push/subscription", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }) });
        setEnabled(false);
        return;
      }

      const consent = window.confirm("친구의 새 계획 알림을 위해 이 기기의 푸시 구독정보를 저장합니다. 알림을 끄면 삭제됩니다. 동의하고 알림을 켤까요?");
      if (!consent) return;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("휴대폰 설정에서 알림 권한을 허용해 주세요.");
      const keyResponse = await fetch("/api/push/public-key");
      if (!keyResponse.ok) throw new Error("알림 설정을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.");
      const { publicKey } = await keyResponse.json();
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const response = await fetch("/api/push/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription) });
      if (!response.ok) { await subscription.unsubscribe(); throw new Error("알림 구독을 저장하지 못했어요."); }
      setEnabled(true);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "알림 설정 중 문제가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return <span className="notification-unsupported" title="이 기기에서는 홈 화면에 설치한 뒤 알림을 사용할 수 있어요">알림 미지원</span>;
  return <button className={`notification-button ${enabled ? "enabled" : ""}`} onClick={() => void toggle()} disabled={busy} aria-pressed={enabled}>{busy ? "확인 중" : enabled ? "● 알림 켬" : "○ 알림 켜기"}</button>;
}

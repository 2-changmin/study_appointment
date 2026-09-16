import type { Metadata } from "next";
import { requireChatGPTUser, chatGPTSignOutPath } from "./chatgpt-auth";
import { isAllowedEmail } from "./allowed-users";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "약속메이트 — 친구와 함께 지키는 계획",
  description: "계획을 올리고, 친구의 승인을 받고, 함께 끝까지 지켜보세요.",
  openGraph: { title: "약속메이트", description: "친구와 함께 지키는 10,000원의 약속", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "약속메이트", description: "친구와 함께 지키는 10,000원의 약속", images: ["/og.png"] },
  manifest: "/manifest.webmanifest",
  themeColor: "#17251f",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireChatGPTUser("/");
  const allowed = isAllowedEmail(user.email);

  return (
    <html lang="ko">
      <body>
        {allowed ? children : (
          <main className="access-denied">
            <div className="access-card">
              <span className="access-lock">×</span>
              <p className="eyebrow dark">PRIVATE FOR TWO</p>
              <h1>허용되지 않은 계정이에요</h1>
              <p>약속메이트는 등록된 두 계정만 이용할 수 있어요.<br /><b>{user.email}</b> 계정에는 접근 권한이 없습니다.</p>
              <a href={chatGPTSignOutPath("/")}>다른 ChatGPT 계정으로 로그인</a>
            </div>
          </main>
        )}
      </body>
    </html>
  );
}

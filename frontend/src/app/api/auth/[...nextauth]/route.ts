// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

// 例として、ユーザー情報を取得し、パスワードを検証するユーティリティ関数
// これらは実際のDB連携やセキュリティ要件に合わせて実装してください。
async function getUserByEmail(email: string) {
  // DBからユーザー情報を取得する処理を実装する
  // 例:
  // return await db.user.findUnique({ where: { email } });
  return { id: "1", email, password: "$2a$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" }; // 仮の値（bcryptハッシュ）  
}

async function verifyPassword(password: string, hashedPassword: string) {
  // bcrypt などを使ってパスワードを検証する処理
  // 例:
  // return await bcrypt.compare(password, hashedPassword);
  return true; // 仮実装
}

export const authOptions: NextAuthOptions = {
  providers: [
    // 独自認証（メール/パスワード）
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }
        const user = await getUserByEmail(credentials.email);
        if (!user) {
          throw new Error("User not found");
        }
        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }
        // ユーザーオブジェクトを返す（ここで返した値は JWT のペイロードに保存される）  
        return { id: user.id, email: user.email };
      },
    }),
    // Google OAuth 認証
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt", // JWT セッションを使用する
  },
  secret: process.env.NEXTAUTH_SECRET, // 強力な秘密鍵を設定（.env.local で設定）  
  callbacks: {
    async jwt({ token, user }) {
      // 初回ログイン時に user オブジェクトが存在するので token に情報を追加する
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  debug: true,

  providers: [
    // CredentialsProvider is used for email/password login
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        // call my Gin backend login API
        const res = await fetch("http://localhost/api/login/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          })
        });
        if (!res.ok) {
          throw new Error("Failed to login");
        }

        // The backend returns JSON which includes a JWT token and user info.
        // For example: { email: "test@test.com", token: "..." }
        const data = await res.json();

        // Return a user object that will be saved to the NextAuth JWT
        return { id: data.email, email: data.email, token: data.token };
      },
    }),
    // OAuth providers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  jwt: {
    async encode({ token, secret }) {
      return require("jsonwebtoken").sign(token, secret, { algorithm: "HS256" });
    },
    async decode({ token, secret }) {
      return require("jsonwebtoken").verify(token, secret, { algorithms: ["HS256"] });
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign in, user will be defined
      if (user) {
        token.token = user.token; // store the backend JWT if needed
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Make token available in the session
      session.user = {
        email: token.email,
        token: token.token,
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

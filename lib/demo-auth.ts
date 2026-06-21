import type { Role } from "@/types/app";

export const demoAuthCookieName = "rasd_demo_auth";

export function isDemoLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEMO_LOGIN === "true";
}

export function getDemoCredentials() {
  return {
    username: process.env.DEMO_ADMIN_USER ?? "admin",
    password: process.env.DEMO_ADMIN_PASSWORD ?? "123"
  };
}

export function isValidDemoLogin(username: string, password: string) {
  const demo = getDemoCredentials();
  return isDemoLoginEnabled() && username === demo.username && password === demo.password;
}

export function getDemoSession() {
  return {
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@local.rasd"
    },
    profile: {
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@local.rasd",
      full_name: "Local Admin",
      role: "admin" as Role
    }
  };
}

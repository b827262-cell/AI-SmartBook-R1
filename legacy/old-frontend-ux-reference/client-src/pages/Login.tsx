import { getOAuthLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const autoLoginAttempted = useRef(false);
  const oauthUrl = getOAuthLoginUrl();
  const isDevAutoLoginEnabled =
    !import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEV_AUTO_LOGIN === "true";

  const loginMutation = trpc.auth.loginLocal.useMutation({
    onMutate: variables => {
      console.log(`Calling loginLocal for username: ${variables.username}`);
    },
    onSuccess: async () => {
      console.log("Login success");
      setError(null);
      await utils.auth.me.invalidate();
      navigate("/");
      window.setTimeout(() => {
        if (window.location.pathname === "/login") {
          window.location.href = "/";
        }
      }, 250);
    },
    onError: err => {
      console.log("Login failed", err.message);
      setError(err.message);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    loginMutation.mutate({ username, password });
  };

  useEffect(() => {
    if (!isDevAutoLoginEnabled) return;
    if (autoLoginAttempted.current) return;

    const params = new URLSearchParams(window.location.search);
    const queryUsername = params.get("username");
    const queryPassword = params.get("password");
    if (!queryUsername || !queryPassword) return;

    autoLoginAttempted.current = true;
    console.log("Auto login detected");
    setUsername(queryUsername);
    setPassword(queryPassword);
    setError(null);
    loginMutation.mutate({ username: queryUsername, password: queryPassword });
  }, [isDevAutoLoginEnabled, loginMutation]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl">登入</CardTitle>
          <CardDescription>使用本機帳號登入系統。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">帳號</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={event => setUsername(event.target.value)}
                disabled={loginMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                disabled={loginMutation.isPending}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "登入中..." : "登入"}
            </Button>
          </form>

          {oauthUrl !== "#" && (
            <div className="mt-6 border-t pt-4">
              <Button variant="outline" className="w-full" onClick={() => { window.location.href = oauthUrl; }}>
                使用 Manus OAuth 登入
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/lib/utils/ui/card";
import { Button } from "@/lib/utils/ui/button";
import { Input } from "@/lib/utils/ui/input";
import { Label } from "@/lib/utils/ui/label";
import { account} from '@/lib/appwrite';  
import { useNavigate } from "react-router-dom";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkLoginStatus() {
      try {
        const user = await account.get();
        console.log("User logged in:", user);
        navigate('/dashboard/home');
      } catch {
        
      }
    }

    checkLoginStatus();
  }, [navigate]);

  async function login(email: string, password: string) {
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      console.log("User logged in:", user);
      navigate('/dashboard/home');
    } catch (error) {
      console.error("Login failed", error);
      setError("Login failed. Please check your credentials and try again.");
    }
  }

  return (
    <>
      <div className="pl-5 pt-5">
        <img
          src="https://cdn.nuawoman.com/global/img/header/NuaLogo2021-TM.png"
          alt="Nua Logo"
          width="80"
          height="40"
        />
      </div>
      <section className="flex justify-center items-center h-screen">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl" style={{ color: "#f18070" }}>
              Login
            </CardTitle>
            <CardDescription>
              Enter your email below to login to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                value={email}
                onChange={e => setEmail(e.target.value)}
                id="email"
                type="email"
                placeholder="Email: monil.karania@nuawoman.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                id="password"
                type="password"
                placeholder="Password: nuawomanisthebest"
                required
              />
            </div>
            {error && <div className="text-red-500">{error}</div>}
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => login(email, password)}
              className="w-full"
              style={{ backgroundColor: "#7c726c" }}
            >
              SUBMIT
            </Button>
          </CardFooter>
        </Card>
      </section>
    </>
  );
};

export default LoginPage;

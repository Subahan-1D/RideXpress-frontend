/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/modules/Authentication/RegisterForm.tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Password from "@/components/ui/Password";
import { toast } from "sonner";
import {
  useLoginMutation,
  useRegisterMutation,
  useLazyUserInfoQuery,
} from "@/redux/features/auth/auth.api";
import { FcGoogle } from "react-icons/fc";
import config from "@/config";
import { Label } from "@/components/ui/label";
import { Car, User } from "lucide-react";

import { useDispatch } from "react-redux";
import { setCredentials } from "@/redux/features/authSlice";

const registerSchema = z
  .object({
    name: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    role: z.enum(["RIDER", "DRIVER"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const roleRedirectMap: Record<"RIDER" | "DRIVER", string> = {
  RIDER: "/rider/request-ride",
  DRIVER: "/rider/driver-request", 
};

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [register] = useRegisterMutation();
  const [login] = useLoginMutation();
  const [triggerUserInfo] = useLazyUserInfoQuery();
  const navigate = useNavigate();
  
  const dispatch = useDispatch();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "RIDER",
    },
  });

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    const userInfo = {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role, 
    };

    try {
 
      await register(userInfo).unwrap();
      toast.success("User created successfully");

    
      const res = await login({ email: data.email, password: data.password }).unwrap();

      if (res.success && res.data) {
        dispatch(
          setCredentials({
            user: res.data.user,
            accessToken: res.data.accessToken || "",
          })
        );
      }

 
      try {
        await triggerUserInfo(undefined).unwrap();
      } catch (_) {
        // ignore
      }

   
      const redirectTo = roleRedirectMap[data.role] ?? "/";
      navigate(redirectTo, { replace: true });
    } catch (error: any) {
      console.log(error);
      toast.error(error?.data?.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-muted-foreground">
          Create your account to get started
        </p>
      </div>

      <div className="grid gap-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            {...props}
          >
            {/* Role selector buttons */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => {
                const selectedRole = form.watch("role");
                return (
                  <FormItem>
                    <Label className="text-sm font-medium">I want to</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={
                          selectedRole === "RIDER" ? "default" : "outline"
                        }
                        onClick={() => field.onChange("RIDER")}
                        aria-pressed={selectedRole === "RIDER"}
                      >
                        <User className="w-4 h-4" />
                        Get Rides
                      </Button>
                      <Button
                        type="button"
                        variant={
                          selectedRole === "DRIVER" ? "default" : "outline"
                        }
                        onClick={() => field.onChange("DRIVER")}
                        aria-pressed={selectedRole === "DRIVER"}
                      >
                        <Car className="w-4 h-4" />
                        Drive & Earn
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="john.doe@company.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Password {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Password {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Submit
            </Button>
          </form>
        </Form>

        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            Or continue with
          </span>
        </div>
        <Button
          onClick={() =>
            (window.location.href = `${config.baseUrl}/auth/google`)
          }
          type="button"
          variant="outline"
          className="w-full cursor-pointer"
        >
          <FcGoogle />
          Login with Google
        </Button>
      </div>
      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link to="/login" className="underline underline-offset-4">
          Login Now
        </Link>
      </div>
    </div>
  );
}
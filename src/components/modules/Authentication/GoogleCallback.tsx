import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAppDispatch } from "@/redux/hook";
import { setCredentials } from "@/redux/features/authSlice";
import { useLazyUserInfoQuery } from "@/redux/features/auth/auth.api";

const GoogleCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [triggerUserInfo] = useLazyUserInfoQuery();

  useEffect(() => {
    const handleGoogleLogin = async () => {
      const params = new URLSearchParams(location.search);
      const err = params.get("err"); // backend sends ?err=SUSPENDED or ?err=BLOCKED

      if (err === "SUSPENDED" || err === "BLOCKED") {
        toast.error(`Your account is ${err}`);
        navigate("/account-status", { state: { status: err } });
        return;
      }

      const token = params.get("token"); // backend sends JWT if login is successful
      
      if (token) {
        console.log("✅ Token received from Google:", token);
        dispatch(setCredentials({ user: null, accessToken: token }));

        try {
         
          const userRes = await triggerUserInfo(undefined).unwrap();

      
          if (userRes?.data) {
            dispatch(setCredentials({ user: userRes.data, accessToken: token }));
            toast.success("Logged in successfully with Google");
            navigate("/"); // dashboard
          }
        } catch (error) {
          console.error("Failed to fetch user info after Google login:", error);
          toast.error("Failed to load user profile");
          navigate("/login");
        }
      } else {
        toast.error("Something went wrong with Google login");
        navigate("/login");
      }
    };

    handleGoogleLogin();
  }, [location, navigate, dispatch, triggerUserInfo]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p className="text-lg font-medium text-muted-foreground">Authenticating your account...</p>
    </div>
  );
};

export default GoogleCallback;
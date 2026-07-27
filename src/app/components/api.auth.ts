import { BASE_URL } from "./api";

export const requestLoginOtp = async (mobileNumber: string) => {
  const res = await fetch(`${BASE_URL}/api/user/signin?mobile=${mobileNumber}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobileNumber }),
  });

  return res.json();
};

export const requestSignupOtp = async (formData: any) => {
  const res = await fetch(`${BASE_URL}/api/user/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  return res.json();
};

export const verifyOtp = async (
  mobileNumber: string,
  otp: string,
  mode: "login" | "signup"
) => {
  const endpoint =
    mode === "login"
      ? "/api/user/verify_login_otp"
      : "/api/user/verify_signup_otp";

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobileNumber, otp }),
  });

  return res.json();
};

export const googleSignInApi = async (email: string, name: string) => {
  const res = await fetch(`${BASE_URL}/api/user/googleSignIn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name }),
  });

  return res.json();
};
import { Toaster } from "react-hot-toast";

/** Toast system global — voir src/utils/toast.ts pour les helpers success()/error(). */
export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          background: "#171717",
          color: "#ffffff",
          borderRadius: "10px",
          fontSize: "13px",
          padding: "10px 14px",
        },
        success: { iconTheme: { primary: "#16803C", secondary: "#fff" } },
        error: { iconTheme: { primary: "#C62828", secondary: "#fff" } },
      }}
    />
  );
}

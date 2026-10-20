import { AppLoading } from "@/components/AppLoading";

export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <AppLoading />
    </div>
  );
}

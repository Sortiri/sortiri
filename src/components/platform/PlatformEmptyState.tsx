import { EmptyState } from "@/components/platform/EmptyState";

type PlatformEmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

type PlatformEmptyStateProps = {
  title: string;
  body: string;
  actions?: PlatformEmptyStateAction[];
};

export function PlatformEmptyState({ title, body, actions }: PlatformEmptyStateProps) {
  return <EmptyState title={title} body={body} actions={actions} />;
}

import * as React from "react";
import { Input } from "@/components/ui/input";

type EmailFieldProps = React.ComponentProps<typeof Input>;

export const EmailField = React.forwardRef<HTMLInputElement, EmailFieldProps>(
  (props, ref) => {
    return <Input ref={ref} type="email" {...props} />;
  },
);

EmailField.displayName = "EmailField";

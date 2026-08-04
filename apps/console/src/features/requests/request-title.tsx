import { InlineEditableText } from "@moc/ui/components/form/inline-editable-text";

type RequestTitleProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function RequestTitle({ value, onChange, className }: RequestTitleProps) {
  return <InlineEditableText value={value} onSave={onChange} className={className} />;
}

import { useState, type ChangeEvent } from "react";

type UseBookingEquipmentPickerOptions = {
  otherEquipment: string;
  onOtherChange: (text: string) => void;
  onToggle: (label: string) => void;
};

export function useBookingEquipmentPicker({ otherEquipment, onOtherChange, onToggle }: UseBookingEquipmentPickerOptions) {
  const [isOtherOpen, setOtherOpen] = useState(otherEquipment.trim().length > 0);

  function toggleOther() {
    const nextOpen = !isOtherOpen;
    setOtherOpen(nextOpen);
    if (!nextOpen) onOtherChange("");
  }

  function changeEquipment(event: ChangeEvent<HTMLInputElement>) {
    onToggle(event.target.value);
  }

  function changeOther(event: ChangeEvent<HTMLTextAreaElement>) {
    onOtherChange(event.target.value);
  }

  return { state: { isOtherOpen }, actions: { changeEquipment, changeOther, toggleOther } };
}

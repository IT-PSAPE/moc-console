export type BookingStatus = "checked_out" | "returned";

export type Booking = {
  id: string;
  equipmentId: string;
  equipmentName: string;
  bookedBy: string;
  checkedOutDate: string;
  returnedDate: string | null;
  duration: string;
  notes: string;
  status: BookingStatus;
};

import { twMerge } from "tailwind-merge";

export function cn(...classes: Array<string | false | null | undefined>) {
    // return classes.filter(Boolean).join(" ");
    return twMerge(classes)
}
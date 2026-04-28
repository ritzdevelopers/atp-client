"use client";

type InputProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export default function Input({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
}: InputProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-[#0C123A]">
        {label}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0C123A] outline-none transition focus:border-[#C99237] focus:ring-2 focus:ring-[#C99237]/30"
      />
    </div>
  );
}

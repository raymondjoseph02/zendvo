"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, Clock3 } from "lucide-react";
import Button from "@/components/Button";
import Image from "next/image";
import UserProfile from "@/assets/images/user.png";

export type GiftContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type GiftTemplate = {
  id: string;
  name: string;
};

export type GiftDetailsFormValues = {
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  amount: string;
  currency: string;
  message: string;
  templateId: string;
  hideAmountUntilUnlock: boolean;
  anonymousUntilUnlock: boolean;
  unlockDate: string;
  unlockTime: string;
};

type SendGiftDetailsFormProps = {
  contacts: GiftContact[];
  templates: GiftTemplate[];
  value: GiftDetailsFormValues;
  onChange: (next: GiftDetailsFormValues) => void;
  onContinue: () => void;
};

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

const PurpleLoader = ({ spinning }: { spinning: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={spinning ? "animate-spin" : ""}
    aria-hidden="true"
  >
    <path
      d="M8 1.2V3.2M8 12.8V14.8M1.2 8H3.2M12.8 8H14.8M2.8 2.8L4.2 4.2M11.8 11.8L13.2 13.2M2.8 13.2L4.2 11.8M11.8 4.2L13.2 2.8"
      stroke="#5A42DE"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const SendGiftDetailsForm: React.FC<SendGiftDetailsFormProps> = ({
  contacts,
  templates,
  value,
  onChange,
  onContinue,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState(value.recipientPhone);

  const filteredContacts = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => {
      return (
        contact.name.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query)
      );
    });
  }, [contacts, recipientQuery]);

  useEffect(() => {
    if (!isSearching) return;
    const timer = setTimeout(() => setIsSearching(false), 600);
    return () => clearTimeout(timer);
  }, [isSearching]);

  const isContinueDisabled =
    !value.recipientId || !value.amount || Number(value.amount) <= 0;

  const handleAmountChange = (nextValue: string) => {
    const normalized = nextValue.replace(/[^\d.]/g, "");
    onChange({ ...value, amount: normalized });
  };

  const handleRecipientSelect = (contact: GiftContact) => {
    setRecipientQuery(contact.phone);
    setIsSearching(false);
    onChange({
      ...value,
      recipientId: contact.id,
      recipientName: contact.name,
      recipientEmail: contact.email,
      recipientPhone: contact.phone,
    });
  };

  return (
    <div className="w-full px-3 py-6 md:py-8">
      <div className="w-full max-w-[360px] mx-auto rounded-3xl bg-[#FAFAFB] border border-[#EEEEF3] p-4 md:p-5">
        <h1
          className="text-[24px] leading-8 text-[#18181B]"
          style={{ fontFamily: "BR Firma, sans-serif", fontWeight: 500 }}
        >
          Send a Gift
        </h1>
        <p className="text-[10px] leading-4 text-[#717182] mt-2">
          Enter recipient details to send a gift
        </p>

        <div className="mt-4">
          <p className="text-[10px] text-[#A1A1AA] mb-1.5">Recipient No</p>
          <div className="h-9 rounded-[10px] border border-[#E5E7EB] bg-white px-2 flex items-center gap-2 overflow-hidden">
            <div className="h-7 px-2 rounded-md border border-[#E5E7EB] flex items-center gap-1 bg-white">
              <span className="inline-flex size-3 overflow-hidden rounded-full border border-[#D4D4D8]">
                <span className="w-1/3 bg-[#5EA945]" />
                <span className="w-1/3 bg-white" />
                <span className="w-1/3 bg-[#5EA945]" />
              </span>
              <span className="text-[10px] text-[#52525B]">+234</span>
              <ChevronDown size={10} className="text-[#A1A1AA]" />
            </div>
            <input
              value={recipientQuery}
              onChange={(event) => {
                const next = event.target.value;
                setRecipientQuery(next);
                setIsSearching(Boolean(next.trim()));
                if (!next.trim()) {
                  onChange({
                    ...value,
                    recipientId: "",
                    recipientName: "",
                    recipientEmail: "",
                    recipientPhone: "",
                  });
                }
              }}
              placeholder="81 123 45 678"
              className="flex-1 text-[10px] text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none"
            />
            <PurpleLoader spinning={isSearching} />
          </div>
        </div>

        <div className="mt-2 rounded-[10px] border border-[#ECECF1] bg-white overflow-hidden">
          {filteredContacts.length === 0 ? (
            <p className="text-[10px] text-[#717182] px-3 py-3">
              No contact matched your search
            </p>
          ) : (
            <ul className="max-h-20 overflow-y-auto divide-y divide-[#F0F0F3]">
              {filteredContacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    type="button"
                    onClick={() => handleRecipientSelect(contact)}
                    className={`w-full text-left px-3 py-2 hover:bg-[#F7F7FC] ${
                      value.recipientId === contact.id ? "bg-[#F1EDFF]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={UserProfile}
                        alt="Contact avatar"
                        width={24}
                        height={24}
                        className="size-6 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-[11px] leading-4 font-semibold text-[#18181B]">
                          {contact.phone}
                        </p>
                        <p className="text-[10px] leading-4 text-[#717182]">
                          {contact.name}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3">
          <p className="text-[10px] text-[#A1A1AA] mb-1.5">Enter amount</p>
          <div className="h-9 rounded-[10px] border border-[#E5E7EB] bg-white px-2 flex items-center gap-2">
            <span className="text-[28px] leading-none text-[#18181B] px-1">$</span>
            <input
              value={value.amount}
              onChange={(event) => handleAmountChange(event.target.value)}
              placeholder="5.00 - 1,000"
              className="flex-1 text-[32px] leading-none text-[#18181B] placeholder:text-[#C6C7CF] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onChange({ ...value, amount: String(amount) })}
              className={`h-8 rounded-[8px] text-[10px] border ${
                value.amount === String(amount)
                  ? "bg-[#F1EDFF] border-[#5A42DE] text-[#4C1D95]"
                  : "bg-[#F7F7FC] border-[#ECECF1] text-[#18181B]"
              }`}
            >
              ${amount}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="flex gap-2 items-start text-[10px] text-[#18181B]">
            <input
              type="checkbox"
              checked={value.hideAmountUntilUnlock}
              onChange={(event) =>
                onChange({
                  ...value,
                  hideAmountUntilUnlock: event.target.checked,
                })
              }
              className="mt-0.5 size-3 accent-[#5A42DE]"
            />
            <span>Hide amount until unlocked</span>
          </label>
          <label className="flex gap-2 items-start text-[10px] text-[#18181B]">
            <input
              type="checkbox"
              checked={value.anonymousUntilUnlock}
              onChange={(event) =>
                onChange({
                  ...value,
                  anonymousUntilUnlock: event.target.checked,
                })
              }
              className="mt-0.5 size-3 accent-[#5A42DE]"
            />
            <span>Stay anonymous until unlock</span>
          </label>
        </div>

        <div className="mt-3">
          <p className="text-[10px] text-[#A1A1AA] mb-1.5">
            Select unlock date and time
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-8 rounded-[8px] border border-[#E5E7EB] bg-white px-2 flex items-center gap-2">
              <input
                type="date"
                value={value.unlockDate}
                onChange={(event) =>
                  onChange({ ...value, unlockDate: event.target.value })
                }
                className="flex-1 text-[10px] text-[#52525B] focus:outline-none"
              />
              <Calendar size={11} className="text-[#5A42DE]" />
            </div>
            <div className="h-8 rounded-[8px] border border-[#E5E7EB] bg-white px-2 flex items-center gap-2">
              <input
                type="time"
                value={value.unlockTime}
                onChange={(event) =>
                  onChange({ ...value, unlockTime: event.target.value })
                }
                className="flex-1 text-[10px] text-[#52525B] focus:outline-none"
              />
              <Clock3 size={11} className="text-[#5A42DE]" />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[10px] text-[#A1A1AA] mb-1.5">Message</p>
          <input
            value={value.message}
            onChange={(event) =>
              onChange({ ...value, message: event.target.value.slice(0, 180) })
            }
            placeholder="I dey feel your hustle"
            className="w-full h-8 rounded-[8px] border border-[#E5E7EB] px-2 text-[10px] text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none"
          />
        </div>

        <div className="mt-3">
          <select
            value={value.templateId}
            onChange={(event) =>
              onChange({ ...value, templateId: event.target.value })
            }
            className="w-full h-8 rounded-[8px] border border-[#E5E7EB] px-2 text-[10px] text-[#52525B] bg-white focus:outline-none"
          >
            <option value="">Gift template (optional)</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={onContinue}
          disabled={isContinueDisabled}
          className="w-full mt-3 h-8 rounded-[8px] bg-[#5A42DE] hover:bg-[#4E37CC] text-[11px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default SendGiftDetailsForm;

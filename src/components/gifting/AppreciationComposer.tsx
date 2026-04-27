"use client";

import React, { useMemo, useState } from "react";
import Button from "@/components/Button";

const DEFAULT_TEMPLATES = [
  {
    id: "tpl_thank_you",
    label: "Thank you so much!",
  },
  {
    id: "tpl_best_surprise",
    label: "Best surprise ever!",
  },
  {
    id: "tpl_thoughtful",
    label: "You are amazing! Thanks for the thoughtful gift.",
  },
  {
    id: "tpl_appreciate",
    label: "I appreciate you for thinking of me.",
  },
];

export const AppreciationComposer = () => {
  const [message, setMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );

  const selectedTemplateText = useMemo(() => {
    return (
      DEFAULT_TEMPLATES.find((template) => template.id === selectedTemplateId)
        ?.label || ""
    );
  }, [selectedTemplateId]);

  const handleTemplateSelect = (templateId: string, label: string) => {
    setSelectedTemplateId(templateId);
    setMessage(label);
  };

  const handleMessageChange = (nextValue: string) => {
    setMessage(nextValue);
    if (nextValue !== selectedTemplateText) {
      setSelectedTemplateId(null);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="w-full max-w-sm md:max-w-md">
      <div className="bg-white rounded-2xl shadow-sm border border-[#EEEEF3] p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#18181B]">
            Appreciation message
          </h2>
          <p className="text-xs text-[#717182]">
            Send an appreciation message to your gifter
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="appreciation-message"
              className="text-[13px] text-[#717182]"
            >
              Write a message to your gifter
            </label>
            <textarea
              id="appreciation-message"
              rows={4}
              placeholder="Thanks, you are really thoughtful"
              value={message}
              onChange={(event) => handleMessageChange(event.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white border border-[#E5E7EB] text-sm text-[#030213] placeholder:text-[#C6C7CF] focus:outline-none focus:ring-2 focus:ring-[#5A42DE]/20 focus:border-[#5A42DE] resize-none"
            />
          </div>

          <div className="space-y-3">
            <p className="text-[12px] text-[#717182]">
              Or select from pre-written template
            </p>
            <div className="space-y-2">
              {DEFAULT_TEMPLATES.map((template) => {
                const isSelected = template.id === selectedTemplateId;
                return (
                  <label
                    key={template.id}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[13px] cursor-pointer transition-colors ${
                      isSelected
                        ? "border-[#5A42DE] bg-[#F1EDFF] text-[#2A1E8A]"
                        : "border-[#E5E7EB] bg-white text-[#18181B] hover:bg-[#F7F7FC]"
                    }`}
                  >
                    <span className="flex-1">{template.label}</span>
                    <input
                      type="radio"
                      name="appreciation-template"
                      checked={isSelected}
                      onChange={() =>
                        handleTemplateSelect(template.id, template.label)
                      }
                      className="size-4 text-[#5A42DE] focus:ring-[#5A42DE]"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-[#5A42DE] hover:bg-[#4E37CC] text-white text-[14px] font-semibold"
          >
            Proceed
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AppreciationComposer;

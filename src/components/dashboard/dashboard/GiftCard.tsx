"use client";
import { ArrowLeftIcon } from "@/assets/svg";
import { ChevronRight, GiftIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import PackageIcon from "@/assets/images/package.png";
export const GiftCard = () => {
  const [activeTab, setActiveTab] = useState(1);
  const tabs = [
    { id: 1, name: "gift received" },
    { id: 2, name: "gift send" },
  ];
  return (
    <div className="space-y-5">
      <div className="lg:flex gap-5  hidden">
        <StatCard
          amount="24"
          title="Gift received"
          bgColor="bg-[#F0FDF4]"
          textColor="text-[#22C55E]"
        />
        <StatCard
          amount="04"
          title="Gift sent"
          bgColor="bg-[#FEF2F2]"
          textColor="text-[#EF4444]"
        />
        <StatCard
          amount="07"
          title="Unopened Gift"
          bgColor="bg-[#ECEFFE]"
          textColor="text-[#5A42DE]"
        />
      </div>
      <div className="p-6 bg-white w-full  rounded-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            {tabs.map((tab) => {
              return (
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1 px-2 min-w-31.75 capitalize rounded-full transition-all ease-in-out duration-300 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-[#5A42DE] text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                  key={tab.id}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
          <Link
            href=""
            className="flex items-center justify-center gap-1 text-[#5A42DE] text-xs leading-3 "
          >
            See all <ChevronRight className="size-3.5" />
          </Link>
        </div>
        <div>
          <div className="flex gap-5.75 flex-col lg:flex-row">
            <GiftReleaseCard />
            <GiftReleaseCard />
          </div>
        </div>
      </div>
    </div>
  );
};
const GiftReleaseCard = () => {
  return (
    <div className="px-4 py-5 border border-[#F7F7F8] bg-white flex-1">
      <div className="flex items-center justify-between">
        <div className="flex  items-center gap-2">
          <div className="bg-[#F7F7FC] size-11 rounded-full flex items-center justify-center">
            <Image
              src={PackageIcon.src}
              width={PackageIcon.width}
              height={PackageIcon.height}
              blurDataURL={PackageIcon.blurDataURL}
              alt=""
              className="size-6"
            />
          </div>
          <div>
            <p className="text-base leading-6 text-[#18181B]">
              Gift Release date
            </p>
            <p className="text-xs leading-4 text-[#71717A]">
              12 Dec 2026 : 8:45pm
            </p>
          </div>
        </div>
        <div className="rounded-full border border-[#5A42DE] size-8 flex items-center justify-center">
          <ArrowLeftIcon />
        </div>
      </div>
      <div className="mt-5 flex  justify-between">
        <div className="flex items-center flex-col gap-2">
          <div className="flex items-center gap-1">
            <div className=" h-6 w-5 bg-[#44349F] rounded  text-center text-white text-xs leading-5 font-medium">
              3
            </div>
            <div className=" h-6 w-5 bg-[#44349F] rounded  text-center text-white text-xs leading-5 font-medium">
              3
            </div>
            <div className=" h-6 w-5 bg-[#44349F] rounded  text-center text-white text-xs leading-5 font-medium">
              3
            </div>
          </div>
          <p>Days</p>
        </div>
        <div className="">:</div>
        <div className="flex items-center flex-col gap-2">
          <div className="flex items-center gap-1">
            <div className=" h-6 w-5 bg-[#44349F] rounded  text-center text-white text-xs leading-5 font-medium">
              3
            </div>
            <div className=" h-6 w-5 bg-[#44349F] rounded  text-center text-white text-xs leading-5 font-medium">
              3
            </div>
          </div>
          <p>Hours</p>
        </div>
        <div>:</div>
        <div className="flex gap-2 items-center flex-col">
          <div className="flex items-center gap-1">
            <div className=" h-6 w-5 bg-[#44349F] rounded  text-center text-white text-xs leading-5 font-medium">
              3
            </div>
            <div className=" h-6 w-5 bg-[#44349F] rounded  text-center text-white text-xs leading-5 font-medium">
              3
            </div>
          </div>
          <p>Minutes</p>
        </div>
      </div>
    </div>
  );
};
export const StatCard = ({
  amount,
  title,
  bgColor,
  textColor,
}: {
  amount: string;
  title: string;
  bgColor: string;
  textColor: string;
}) => {
  return (
    <div
      className={`py-7 px-4.25   rounded-2xl bg-white flex-1 min-w-58 md:min-w-0`}
    >
      <div className="flex justify-between items-top">
        <p className="leading-6 text-[#18181B] ">{title}</p>
        <div
          className={`${bgColor} size-8 rounded-xl flex items-center justify-center`}
        >
          <GiftIcon className={`${textColor}`} />
        </div>
      </div>
      <p className={` text-2xl font-semibold text-[#18181B]`}>{amount}</p>
    </div>
  );
};

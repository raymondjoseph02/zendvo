import { IdCardIcon } from "@/assets/svg";
import Link from "next/link";

export const KycCard = () => {
  return (
    <div className="rounded-2xl py-8 px-6 lg:max-w-86.25 bg-[#10083C] space-y-4">
      <IdCardIcon />
      <p className="text-xl text-white leading-7">
        You have not completed you KYC
      </p>
      <Link
        href={"/kyc"}
        className="text-2xl underline underline-offset-3 font-bold text-white"
      >
        Complete your KYC{" "}
      </Link>
    </div>
  );
};

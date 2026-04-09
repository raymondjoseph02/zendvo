import { ArrowLeftIcon } from "@/assets/svg";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import EmptyStateImage from "../../../../public/empty-state.png";
import Image from "next/image";

export const TransactionTable = () => {
  const transactions: {
    id: string;
    type: string;
    amount: string;
    dateTIme: string;
    status: string;
  }[] = [];
  return (
    <div className="bg-white  rounded-4xl space-y-2.5 p-4 min-h-102 flex flex-col">
      <div className="flex items-center justify-between ">
        <p className="text-[#18181B] leading-6">Transaction</p>
        <Link
          href="/transactions"
          className="flex items-center justify-center gap-1 text-[#5A42DE] text-xs leading-3 "
        >
          See all <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto max-w-full  flex-1 flex">
        {transactions.length > 0 ? (
          <table className="w-full min-w-175">
            <thead>
              <tr className="">
                <td className="px-4 py-3.75 bg-[#F7F7FC] text-sm text-[#414F62]  tracking-[0%] leading-[120%]">
                  AX123ERT567
                </td>
                <td className="px-4 py-3.75 bg-[#F7F7FC] text-sm text-[#414F62]  tracking-[0%] leading-[120%]">
                  Type
                </td>
                <td className="px-4 py-3.75 bg-[#F7F7FC] text-sm text-[#414F62]  tracking-[0%] leading-[120%]">
                  Amount
                </td>
                <td className="px-4 py-3.75 bg-[#F7F7FC] text-sm text-[#414F62]  tracking-[0%] leading-[120%]">
                  Date & Time
                </td>
                <td className="px-4 py-3.75 bg-[#F7F7FC] text-sm text-[#414F62]  tracking-[0%] leading-[120%]">
                  Status
                </td>
                <td className="px-4 py-3.75 bg-[#F7F7FC] text-sm text-[#414F62]  tracking-[0%] leading-[120%]">
                  Action
                </td>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="">
                  <td className="py-5.25 px-4 text-sm font-medium leading-5 text-[#18181B]  tracking-[0%] text-nowrap">
                    {transaction.id}
                  </td>
                  <td className="py-5.25 px-4 text-sm font-medium leading-5 text-[#18181B]  tracking-[0%] text-nowrap">
                    {transaction.type}
                  </td>
                  <td className="py-5.25 px-4 text-sm font-medium leading-5 text-[#18181B]  tracking-[0%] text-nowrap">
                    {transaction.amount}
                  </td>
                  <td className="py-5.25 px-4 text-sm font-medium leading-5 text-[#18181B]  tracking-[0%] text-nowrap">
                    {transaction.dateTIme}
                  </td>
                  <td className="py-5.25 px-4 text-sm font-medium leading-5 text-[#18181B]  tracking-[0%] text-nowrap">
                    {transaction.status}
                  </td>
                  <td className="pl-4  text-nowrap">
                    <Link
                      href={""}
                      className="flex gap-1 px-3 py-2 items-center border border-[#5A42DE] w-fit  rounded-lg text-[#5A42DE]"
                    >
                      <span>View Details</span>
                      <ArrowLeftIcon />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className=" flex h-full  flex-1 items-center justify-center self-center">
            <div className="max-w-3xs flex flex-col gap-4.5 items-center justify-center">
              <Image
                src={EmptyStateImage.src}
                width={150}
                height={150}
                alt="Empty state"
                className="h-32 w-auto"
              />
              <p className="text-base text-center leading-6 text-[#18181B] ">
                You have not performed any transactions yet
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

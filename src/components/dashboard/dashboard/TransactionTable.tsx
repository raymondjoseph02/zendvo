import { ArrowLeftIcon } from "@/assets/svg";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export const TransactionTable = () => {
  const transactions = [
    {
      id: "NBV890QWE234",
      type: "Gift Received",
      amount: "$200",
      dateTIme: "Dec 12, 2023 10:00 AM",
      status: "Completed",
    },
    {
      id: "POI456JKL789",
      type: "Withdrawal",
      amount: "$50",
      dateTIme: "Dec 05, 2023 04:30 PM",
      status: "Pending",
    },
    {
      id: "ZXC987MNO123",
      type: "Gift Sent",
      amount: "$300",
      dateTIme: "Dec 05, 2023 04:30 PM",
      status: "Completed",
    },
    {
      id: "LKJ654TRE321",
      type: "Top Up",
      amount: "$100",
      dateTIme: "Nov 15, 2023 02:45 PM",
      status: "Failed",
    },
  ];
  return (
    <div className="bg-white  rounded-4xl space-y-2.5 p-4">
      <div className="flex items-center justify-between ">
        <p className="text-[#18181B] leading-6">Transaction</p>
        <Link
          href="/transactions"
          className="flex items-center justify-center gap-1 text-[#5A42DE] text-xs leading-3 "
        >
          See all <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <div className="overflow-x-auto max-w-full">
        <table className="w-full min-w-[700px]">
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
      </div>
    </div>
  );
};

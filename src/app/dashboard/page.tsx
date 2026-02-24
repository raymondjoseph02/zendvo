import { AccountBalanceCard } from "@/components/dashboard/dashboard/AccountBalanceCard";
import { GiftCard, StatCard } from "@/components/dashboard/dashboard/GiftCard";
import { TransactionTable } from "@/components/dashboard/dashboard/TransactionTable";

export const DashboardPage = () => {
  return (
    <div className="bg-[#F7F7FC] rounded-4xl p-6 h-full space-y-5">
      <div>
        <h1 className="text-2xl leading-8 font-medium text-[#18181B]">
          Hello, Eze!
        </h1>
        <p className="text-sm font-normal text-[#18181B] leading-6 ">
          Here’s your over of your account
        </p>
      </div>
      <div className="flex gap-5 lg:hidden overflow-auto">
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
      <div className="flex gap-5  flex-col xl:flex-row">
        <AccountBalanceCard />
        <div className="w-full flex-1">
          <GiftCard />
        </div>
      </div>
      <TransactionTable />
    </div>
  );
};
export default DashboardPage;

import AppreciationComposer from "@/components/gifting/AppreciationComposer";

const AppreciateGiftPage = () => {
  return (
    <div className="px-3 pb-3 md:px-6 md:pb-6">
      <div className="min-h-[calc(100vh-122px)] rounded-3xl bg-[#F5F5FA] border border-[#EEEEF3] flex items-center justify-center">
        <AppreciationComposer />
      </div>
    </div>
  );
};

export default AppreciateGiftPage;

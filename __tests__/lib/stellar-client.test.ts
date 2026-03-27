const mockGetAccount = jest.fn();
const mockPrepareTransaction = jest.fn();
const mockSendTransaction = jest.fn();
const mockPollTransaction = jest.fn();
const mockContractCall = jest.fn();
const mockAddressToScVal = jest.fn(() => "sender-scval");
const mockNativeToScVal = jest.fn((value: string, options: { type: string }) => ({
  type: options.type,
  value,
}));
const mockPreparedTransactionSign = jest.fn();
const mockSignerPublicKey = jest.fn(() => "GCONFIGUREDSIGNERPUBKEY");
const mockKeypairFromSecret = jest.fn(() => ({
  publicKey: mockSignerPublicKey,
}));
const mockSenderAddress = { toScVal: mockAddressToScVal };

class MockRpcServer {
  getAccount = mockGetAccount;
  prepareTransaction = mockPrepareTransaction;
  sendTransaction = mockSendTransaction;
  pollTransaction = mockPollTransaction;
}

class MockTransactionBuilder {
  addOperation = jest.fn().mockReturnThis();
  setTimeout = jest.fn().mockReturnThis();
  build = jest.fn(() => ({ id: "unsigned-transaction" }));

  constructor(
    readonly sourceAccount: unknown,
    readonly options: unknown,
  ) {}
}

jest.mock("@stellar/stellar-sdk", () => ({
  Address: {
    fromString: jest.fn(() => mockSenderAddress),
  },
  BASE_FEE: "100",
  Contract: jest.fn(() => ({
    call: mockContractCall,
  })),
  Horizon: {
    Server: jest.fn(),
  },
  Keypair: {
    fromSecret: mockKeypairFromSecret,
  },
  Networks: {
    TESTNET: "Test SDF Network ; September 2015",
  },
  StrKey: {
    isValidContract: jest.fn((value: string) => value === "CCONTRACTID"),
    isValidEd25519PublicKey: jest.fn(
      (value: string) => value === "GCONFIGUREDSIGNERPUBKEY",
    ),
  },
  TransactionBuilder: MockTransactionBuilder,
  nativeToScVal: mockNativeToScVal,
  rpc: {
    GetTransactionStatus: {
      SUCCESS: "SUCCESS",
    },
    LinearSleepStrategy: jest.fn(),
    Server: MockRpcServer,
  },
  xdr: {
    ScVal: {
      scvBytes: jest.fn((value: Buffer) => ({
        bytes: value.toString("hex"),
      })),
    },
  },
}));

import { EscrowContract } from "@/lib/stellar/client";

describe("EscrowContract.create_gift", () => {
  const originalEnv = process.env;
  const submittedHash = "a".repeat(64);
  const finalizedHash = "b".repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_STELLAR_CONTRACT_ID: "CCONTRACTID",
      STELLAR_SECRET_KEY: "SSECRET",
      STELLAR_SOROBAN_RPC_URL: "https://rpc.example.com",
      STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    };

    mockGetAccount.mockResolvedValue({ accountId: "GCONFIGUREDSIGNERPUBKEY" });
    mockPrepareTransaction.mockResolvedValue({
      sign: mockPreparedTransactionSign,
    });
    mockSendTransaction.mockResolvedValue({
      hash: submittedHash,
      status: "PENDING",
    });
    mockPollTransaction.mockResolvedValue({
      status: "SUCCESS",
      txHash: finalizedHash,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("submits create_gift and returns the finalized transaction hash", async () => {
    const recipientHash = "11".repeat(32);

    const txHash = await EscrowContract.create_gift({
      sender: "GCONFIGUREDSIGNERPUBKEY",
      recipientHash,
      amount: "1000",
      locktime: "1711549200",
    });

    expect(txHash).toBe(finalizedHash);
    expect(mockContractCall).toHaveBeenCalledWith(
      "create_gift",
      "sender-scval",
      { bytes: recipientHash },
      { type: "u128", value: "1000" },
      { type: "u64", value: "1711549200" },
    );
    expect(mockPreparedTransactionSign).toHaveBeenCalledTimes(1);
    expect(mockPollTransaction).toHaveBeenCalledWith(submittedHash, {
      attempts: 10,
      sleepStrategy: expect.any(Function),
    });
  });

  it("fails fast when config is missing", async () => {
    delete process.env.STELLAR_SECRET_KEY;

    await expect(
      EscrowContract.create_gift({
        sender: "GCONFIGUREDSIGNERPUBKEY",
        recipientHash: "22".repeat(32),
        amount: 5,
        locktime: 1000,
      }),
    ).rejects.toThrow("Stellar secret key is not configured");
  });

  it("maps simulation failures to a sanitized error", async () => {
    mockPrepareTransaction.mockRejectedValue(new Error("rpc simulate failed"));

    await expect(
      EscrowContract.create_gift({
        sender: "GCONFIGUREDSIGNERPUBKEY",
        recipientHash: "33".repeat(32),
        amount: 5,
        locktime: 1000,
      }),
    ).rejects.toThrow("Transaction simulation failed: rpc simulate failed");
  });

  it("rejects submission errors without exposing raw internals", async () => {
    mockSendTransaction.mockResolvedValue({
      hash: submittedHash,
      status: "ERROR",
    });

    await expect(
      EscrowContract.create_gift({
        sender: "GCONFIGUREDSIGNERPUBKEY",
        recipientHash: "44".repeat(32),
        amount: 5,
        locktime: 1000,
      }),
    ).rejects.toThrow("Transaction submission failed");
  });

  it("rejects malformed recipient hashes before invoking the SDK", async () => {
    await expect(
      EscrowContract.create_gift({
        sender: "GCONFIGUREDSIGNERPUBKEY",
        recipientHash: "not-a-hash",
        amount: 5,
        locktime: 1000,
      }),
    ).rejects.toThrow("Recipient hash must be a 32-byte hex string");

    expect(mockContractCall).not.toHaveBeenCalled();
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { usePortfolio } from "@/hooks/usePortfolio";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => ({
  fetchBetsByAddress: jest.fn(),
  fetchPortfolioSummary: jest.fn(),
}));

const mockFetchBetsByAddress = api.fetchBetsByAddress as jest.Mock;
const mockFetchPortfolioSummary = api.fetchPortfolioSummary as jest.Mock;

describe("usePortfolio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty state when address is null", () => {
    const { result } = renderHook(() => usePortfolio(null));

    expect(result.current.bets).toEqual([]);
    expect(result.current.summary).toBe(null);
    expect(result.current.isLoading).toBe(false);
  });

  it("does not make network request when address is null", async () => {
    renderHook(() => usePortfolio(null));

    await waitFor(() => {
      expect(mockFetchBetsByAddress).not.toHaveBeenCalled();
      expect(mockFetchPortfolioSummary).not.toHaveBeenCalled();
    });
  });

  it("calls both API endpoints in parallel when address is set", async () => {
    const mockBets = [
      {
        id: "bet-1",
        marketId: "market-1",
        bettor: "GADDR",
        side: "FighterA" as const,
        amount: "100000000",
        placedAt: "2024-01-01T00:00:00Z",
        claimed: false,
        payout: null,
      },
    ];
    const mockSummary = {
      totalStaked: "1000000000",
      totalWinnings: "500000000",
      pendingClaims: "300000000",
      activeBets: 2,
      completedBets: 5,
      roi: 0.25,
    };

    mockFetchBetsByAddress.mockResolvedValueOnce(mockBets);
    mockFetchPortfolioSummary.mockResolvedValueOnce(mockSummary);

    const { result } = renderHook(() =>
      usePortfolio("GADDR1234567890ABCDEF")
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.bets).toEqual(mockBets);
      expect(result.current.summary).toEqual(mockSummary);
    });

    // Verify both were called
    expect(mockFetchBetsByAddress).toHaveBeenCalledWith("GADDR1234567890ABCDEF");
    expect(mockFetchPortfolioSummary).toHaveBeenCalledWith("GADDR1234567890ABCDEF");
  });

  it("handles partial failure gracefully - both calls made even on error", async () => {
    const mockBets = [];
    const mockSummary = {
      totalStaked: "1000000000",
      totalWinnings: "500000000",
      pendingClaims: "300000000",
      activeBets: 2,
      completedBets: 5,
      roi: 0.25,
    };

    mockFetchBetsByAddress.mockResolvedValueOnce(mockBets);
    mockFetchPortfolioSummary.mockResolvedValueOnce(mockSummary);

    const { result } = renderHook(() =>
      usePortfolio("GADDR1234567890ABCDEF")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify both were called even if one could have failed
    expect(mockFetchBetsByAddress).toHaveBeenCalled();
    expect(mockFetchPortfolioSummary).toHaveBeenCalled();
  });

  it("refetch re-triggers both API calls", async () => {
    const mockBets = [];
    const mockSummary = {
      totalStaked: "1000000000",
      totalWinnings: "500000000",
      pendingClaims: "300000000",
      activeBets: 2,
      completedBets: 5,
      roi: 0.25,
    };

    mockFetchBetsByAddress.mockResolvedValue(mockBets);
    mockFetchPortfolioSummary.mockResolvedValue(mockSummary);

    const { result } = renderHook(() =>
      usePortfolio("GADDR1234567890ABCDEF")
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchBetsByAddress).toHaveBeenCalledTimes(1);
    expect(mockFetchPortfolioSummary).toHaveBeenCalledTimes(1);

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockFetchBetsByAddress).toHaveBeenCalledTimes(2);
      expect(mockFetchPortfolioSummary).toHaveBeenCalledTimes(2);
    });
  });

  it("clears data when address changes from set to null", async () => {
    const mockBets = [];
    const mockSummary = {
      totalStaked: "1000000000",
      totalWinnings: "500000000",
      pendingClaims: "300000000",
      activeBets: 2,
      completedBets: 5,
      roi: 0.25,
    };

    mockFetchBetsByAddress.mockResolvedValue(mockBets);
    mockFetchPortfolioSummary.mockResolvedValue(mockSummary);

    const { result, rerender } = renderHook(
      ({ address }) => usePortfolio(address),
      { initialProps: { address: "GADDR1234567890ABCDEF" } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.summary).not.toBeNull();
    });

    rerender({ address: null });

    expect(result.current.bets).toEqual([]);
    expect(result.current.summary).toBe(null);
  });

  it("refetches when address changes", async () => {
    const mockBets = [];
    const mockSummary = {
      totalStaked: "1000000000",
      totalWinnings: "500000000",
      pendingClaims: "300000000",
      activeBets: 2,
      completedBets: 5,
      roi: 0.25,
    };

    mockFetchBetsByAddress.mockResolvedValue(mockBets);
    mockFetchPortfolioSummary.mockResolvedValue(mockSummary);

    const { rerender } = renderHook(
      ({ address }) => usePortfolio(address),
      { initialProps: { address: "GADDR1111111111111111" } }
    );

    await waitFor(() => {
      expect(mockFetchBetsByAddress).toHaveBeenCalledWith("GADDR1111111111111111");
    });

    rerender({ address: "GADDR2222222222222222" });

    await waitFor(() => {
      expect(mockFetchBetsByAddress).toHaveBeenCalledWith("GADDR2222222222222222");
    });

    expect(mockFetchBetsByAddress).toHaveBeenCalledTimes(2);
  });
});

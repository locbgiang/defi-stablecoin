export const mockProvider = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  isMetaMask: true,
};

export const mockWallet = {
  address: '0x1234567890123456789012345678901234567890',
  balance: '1000.0',
  connected: true,
  chainId: '0x1', // Ethereum mainnet
};

export const mockContract = {
  balanceOf: jest.fn().mockResolvedValue('1000000000000000000'),
  totalSupply: jest.fn().mockResolvedValue('1000000000000000000000'),
  allowance: jest.fn().mockResolvedValue('0'),
  mint: jest.fn().mockResolvedValue({ hash: '0xmockhash' }),
  burn: jest.fn().mockResolvedValue({ hash: '0xmockhash' }),
  depositCollateral: jest.fn().mockResolvedValue({ hash: '0xmockhash' }),
};

export const mockUserData = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  tokenBalance: '1000.0',
  ethBalance: '2.5',
  collateralDeposited: '500.0',
  stablecoinMinted: '300.0',
  collateralizationRatio: '166.67',
};

export const setupWeb3Mocks = () => {
  Object.defineProperty(window, 'ethereum', {
    value: mockProvider,
    writable: true,
  });
  
  // Reset all mocks
  Object.values(mockContract).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
  
  mockProvider.request.mockClear();
};
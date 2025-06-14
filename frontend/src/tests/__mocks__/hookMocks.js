import { mockWallet, mockContract } from './web3Mocks';

export const mockUseWallet = () => ({
    useWallet: () => mockWallet,
});

export const mockUseContract = () => ({
    useContract: () => mockContract,
});

export const setUpHookMocks = () => {
    jest.mock('../hooks/useWallet', mockUseWallet);
    jest.mock('../hooks/useContract', mockUseContract);
}
import { useState } from 'react';
import { Box, Button, Input, Text, VStack } from '@chakra-ui/react';
import { useWeb3 } from '../contexts/Web3Context';
import { parseEther } from 'ethers';

export function CollateralManagement() {
    const { dscEngine, account } = useWeb3();
    const [collateralAmount, setCollateralAmount] = useState('');
    const [dscAmount, setDscAmount] = useState('');

    const depositCollateralAndMintDsc = async () => {
        try {
            const tx = await dscEngine.depositCollateralAndMintDsc(
                WETH_ADDRESS, // Replace with actual token address
                parseEther(collateralAmount),
                parseEther(dscAmount)
            );
            await tx.wait();
            // Handle success
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return (
        <Box p={4}>
            <VStack spacing={4}>
                <Text fontSize="xl">Deposit Collateral and Mint DSC</Text>
                <Input 
                    placeholder="Collateral Amount"
                    value={collateralAmount}
                    onChange={(e) => setCollateralAmount(e.target.value)}
                />
                <Input 
                    placeholder="DSC Amount"
                    value={dscAmount}
                    onChange={(e) => setDscAmount(e.target.value)}
                />
                <Button 
                    colorScheme="blue"
                    onClick={depositCollateralAndMintDsc}
                >
                    Deposit and Mint
                </Button>
            </VStack>
        </Box>
    );
}
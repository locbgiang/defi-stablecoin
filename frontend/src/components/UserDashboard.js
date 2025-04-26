import { useEffect, useState } from 'react';
import { Box, Text, Stack, Stat } from '@chakra-ui/react';
import { useWeb3 } from '../contexts/Web3Context';
import { formatEther } from 'ethers';

export function UserDashboard() {
    const { dscEngine, account } = useWeb3();
    const [healthFactor, setHealthFactor] = useState('0');
    const [collateralValue, setCollateralValue] = useState('0');
    const [dscMinted, setDscMinted] = useState('0');

    useEffect(() => {
        const fetchUserData = async () => {
            if (dscEngine && account) {
                try {
                    const hf = await dscEngine.getHealthFactor(account);
                    const collateral = await dscEngine.getAccountCollateralValue(account);
                    const [minted, _] = await dscEngine.getAccountInformation(account);
                    
                    setHealthFactor(formatEther(hf));
                    setCollateralValue(formatEther(collateral));
                    setDscMinted(formatEther(minted));
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            }
        };

        fetchUserData();
    }, [dscEngine, account]);

    return (
        <Box p={4}>
            <Stack spacing={4}>
                <Stat>
                    <Text fontWeight="semibold" fontSize="sm">Health Factor</Text>
                    <Text fontSize="2xl" fontWeight="bold">
                        {Number(healthFactor).toFixed(2)}
                    </Text>
                </Stat>
                <Stat>
                    <Text fontWeight="semibold" fontSize="sm">Total Collateral (USD)</Text>
                    <Text fontSize="2xl" fontWeight="bold">
                        ${Number(collateralValue).toFixed(2)}
                    </Text>
                </Stat>
                <Stat>
                    <Text fontWeight="semibold" fontSize="sm">DSC Minted</Text>
                    <Text fontSize="2xl" fontWeight="bold">
                        {Number(dscMinted).toFixed(2)} DSC
                    </Text>
                </Stat>
            </Stack>
        </Box>
    );
}
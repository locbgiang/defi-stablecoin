import { useEffect, useState } from 'react';
import { Box, Text, Stack, Stat, StatLabel, StatNumber } from '@chakra-ui/react';
import { useWeb3 } from '../contexts/Web3Context';
import { parseEther } from 'ethers';

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
                    
                    setHealthFactor(parseEther.utils.formatEther(hf));
                    setCollateralValue(parseEther.utils.formatEther(collateral));
                    setDscMinted(parseEther.utils.formatEther(minted));
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
                    <StatLabel>Health Factor</StatLabel>
                    <StatNumber>{Number(healthFactor).toFixed(2)}</StatNumber>
                </Stat>
                <Stat>
                    <StatLabel>Total Collateral (USD)</StatLabel>
                    <StatNumber>${Number(collateralValue).toFixed(2)}</StatNumber>
                </Stat>
                <Stat>
                    <StatLabel>DSC Minted</StatLabel>
                    <StatNumber>{Number(dscMinted).toFixed(2)} DSC</StatNumber>
                </Stat>
            </Stack>
        </Box>
    );
}
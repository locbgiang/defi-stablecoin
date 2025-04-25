import { ChakraProvider } from '@chakra-ui/react';
import { Web3Provider } from './contexts/Web3Context';
import { CollateralManagement } from './components/CollateralManagement';
import { UserDashboard } from './components/UserDashboard';
import { Box, Container, Button } from '@chakra-ui/react';
import { useWeb3 } from './contexts/Web3Context';

function App() {
    const { account, connectWallet } = useWeb3();

    return (
        <ChakraProvider>
            <Web3Provider>
                <Container maxW="container.xl" py={8}>
                    {!account ? (
                        <Button onClick={connectWallet}>
                            Connect Wallet
                        </Button>
                    ) : (
                        <Box>
                            <UserDashboard />
                            <CollateralManagement />
                        </Box>
                    )}
                </Container>
            </Web3Provider>
        </ChakraProvider>
    );
}

export default App;